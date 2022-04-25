import {
  FirestoreOrder,
  FirestoreOrderItem,
  OBOrderItem,
  OBOrderStatus,
  OBTokenInfo,
  SignedOBOrder
} from '@infinityxyz/lib/types/core';
import { firestoreConstants } from '@infinityxyz/lib/utils';
import { Injectable } from '@nestjs/common';
import FirestoreBatchHandler from 'databases/FirestoreBatchHandler';
import { FirebaseService } from 'firebase/firebase.service';
import { getDocIdHash } from 'utils';
import { OBOrderItemDto } from './dto/ob-order-item.dto';
import { OBTokenInfoDto } from './dto/ob-token-info.dto';
import { SignedOBOrderDto } from './dto/signed-ob-order.dto';

// todo: remove this with the below commented code
// export interface ExpiredCacheItem {
//   listId: MarketListId;
//   order: OBOrder;
// }

// interface SellOrderSave extends OBOrder {
//   collectionAddresses: string[];
// }

@Injectable()
export default class OrdersService {
  constructor(private firebaseService: FirebaseService) {}

  public postOrders(userId: string, orders: SignedOBOrderDto[]) {
    const fsBatchHandler = new FirestoreBatchHandler();
    const ordersCollectionRef = this.firebaseService.firestore.collection(firestoreConstants.ORDERS_COLL);
    for (const order of orders) {
      // get data
      const dataToStore = this.getFirestoreOrderFromSignedOBOrder(order);
      // save
      const docRef = ordersCollectionRef.doc(order.id);
      fsBatchHandler.add(docRef, dataToStore, { merge: true });

      // get order items
      const orderItemsRef = docRef.collection(firestoreConstants.ORDER_ITEMS_SUB_COLL);
      try {
        for (const nft of order.nfts) {
          if (nft.tokens.length === 0) {
            const emptyToken = {
              tokenId: '',
              numTokens: 1, // default for both ERC721 and ERC1155
              tokenImage: '',
              tokenName: '',
              takerAddress: '',
              takerUsername: ''
            };
            const orderItemData = this.getFirestoreOrderItemFromSignedOBOrder(order, nft, emptyToken);
            // get doc id
            const tokenId = '';
            const orderItemDocRef = orderItemsRef.doc(
              getDocIdHash({ collectionAddress: nft.collectionAddress, tokenId, chainId: order.chainId })
            );
            // add to batch
            fsBatchHandler.add(orderItemDocRef, orderItemData, { merge: true });
          } else {
            for (const token of nft.tokens) {
              const orderItemData = this.getFirestoreOrderItemFromSignedOBOrder(order, nft, token);
              // get doc id
              const tokenId = token.tokenId.toString();
              const orderItemDocRef = orderItemsRef.doc(
                getDocIdHash({ collectionAddress: nft.collectionAddress, tokenId, chainId: order.chainId })
              );
              // add to batch
              fsBatchHandler.add(orderItemDocRef, orderItemData, { merge: true });
            }
          }
        }
      } catch (err: any) {
        console.error('Failed saving orders to firestore', err);
      }
    }
    // commit batch
    fsBatchHandler.flush().catch((err) => {
      console.error(err);
    });
  }

  public async getOrders(
    firestoreQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
  ): Promise<SignedOBOrder[]> {
    // fetch query snapshot
    const firestoreOrderItems = await firestoreQuery.get();
    const obOrderItemMap: { [key: string]: { [key: string]: OBOrderItem } } = {};
    const results: SignedOBOrder[] = [];
    for (const orderItemDoc of firestoreOrderItems.docs) {
      const orderItemData = orderItemDoc.data() as FirestoreOrderItem;
      const orderDoc = orderItemDoc.ref.parent.parent;
      const orderDocData = (await orderDoc?.get())?.data() as FirestoreOrder;
      if (!orderDocData) {
        console.error('Cannot fetch order data from firestore for order item', orderItemData.id);
        continue;
      }
      const token: OBTokenInfo = {
        tokenId: orderItemData.tokenId,
        numTokens: orderItemData.numTokens,
        tokenImage: orderItemData.tokenImage,
        tokenName: orderItemData.tokenName,
        takerAddress: orderItemData.takerAddress,
        takerUsername: orderItemData.takerUsername
      };
      const existingOrder = obOrderItemMap[orderItemData.id];
      if (existingOrder) {
        const existingOrderItem = existingOrder[orderItemData.collectionAddress];
        if (existingOrderItem) {
          existingOrderItem.tokens.push(token);
        } else {
          existingOrder[orderItemData.collectionAddress] = {
            collectionAddress: orderItemData.collectionAddress,
            collectionName: orderItemData.collectionName,
            collectionImage: orderItemData.collectionImage,
            tokens: [token]
          };
        }
      } else {
        const obOrderItem: OBOrderItem = {
          collectionAddress: orderItemData.collectionAddress,
          collectionImage: orderItemData.collectionImage,
          collectionName: orderItemData.collectionName,
          tokens: [token]
        };
        obOrderItemMap[orderItemData.id] = { [orderItemData.collectionAddress]: obOrderItem };
      }
      const signedOBOrder: SignedOBOrder = {
        id: orderItemData.id,
        chainId: orderItemData.chainId,
        isSellOrder: orderItemData.isSellOrder,
        numItems: orderItemData.numItems,
        startPriceEth: orderItemData.startPriceEth,
        endPriceEth: orderItemData.endPriceEth,
        startTimeMs: orderItemData.startTimeMs,
        endTimeMs: orderItemData.endTimeMs,
        minBpsToSeller: orderDocData.minBpsToSeller,
        nonce: orderDocData.nonce,
        makerAddress: orderItemData.makerAddress,
        makerUsername: orderItemData.makerUsername,
        nfts: Object.values(obOrderItemMap[orderItemData.id]),
        signedOrder: orderDocData.signedOrder,
        execParams: {
          complicationAddress: orderDocData.complicationAddress,
          currencyAddress: orderDocData.currencyAddress
        },
        extraParams: {}
      };
      results.push(signedOBOrder);
    }
    return results;
  }

  private getFirestoreOrderFromSignedOBOrder(order: SignedOBOrderDto): FirestoreOrder {
    const data: FirestoreOrder = {
      id: order.id,
      orderStatus: OBOrderStatus.ValidActive,
      chainId: order.chainId,
      isSellOrder: order.isSellOrder,
      numItems: order.numItems,
      startPriceEth: order.startPriceEth,
      endPriceEth: order.endPriceEth,
      startTimeMs: order.startTimeMs,
      endTimeMs: order.endTimeMs,
      minBpsToSeller: order.minBpsToSeller,
      nonce: order.nonce,
      complicationAddress: order.execParams.complicationAddress,
      currencyAddress: order.execParams.currencyAddress,
      makerAddress: order.makerAddress,
      makerUsername: order.makerUsername,
      signedOrder: order.signedOrder
    };
    return data;
  }

  private getFirestoreOrderItemFromSignedOBOrder(
    order: SignedOBOrderDto,
    nft: OBOrderItemDto,
    token: OBTokenInfoDto
  ): FirestoreOrderItem {
    const data: FirestoreOrderItem = {
      id: order.id,
      orderStatus: OBOrderStatus.ValidActive,
      chainId: order.chainId,
      isSellOrder: order.isSellOrder,
      numItems: order.numItems,
      startPriceEth: order.startPriceEth,
      endPriceEth: order.endPriceEth,
      startTimeMs: order.startTimeMs,
      endTimeMs: order.endTimeMs,
      makerAddress: order.makerAddress,
      makerUsername: order.makerUsername,
      takerAddress: token.takerAddress,
      takerUsername: token.takerUsername,
      collectionAddress: nft.collectionAddress,
      collectionName: nft.collectionName,
      collectionImage: nft.collectionImage,
      tokenId: token.tokenId,
      numTokens: token.numTokens,
      tokenImage: token.tokenImage,
      tokenName: token.tokenName
    };
    return data;
  }

  // todo: the below stuff doesn't belong in orders service; commenting to reference this when moved to another repo
  // ===============================================================
  // Buy orders

  // async buyOrders(listId: MarketListId, cursor?: string, limit?: number): Promise<OBOrder[]> {
  //   const orders = await this.orderMap(true, listId, cursor, limit);

  //   return Array.from(orders.values());
  // }

  // async addBuyOrder(listId: MarketListId, buyOrder: OBOrder): Promise<void> {
  //   const c = await this.orderMap(true, listId);

  //   if (!c.has(this.obOrderHash(buyOrder))) {
  //     await this.saveBuyOrder(listId, buyOrder);
  //   } else {
  //     console.log(`addBuyOrder already exists ${this.obOrderHash(buyOrder)} ${listId}`);
  //   }
  // }

  // async saveBuyOrder(listId: MarketListId, buyOrder: OBOrder): Promise<OBOrder> {
  //   const collection = this.firebaseService.firestore
  //     .collection(firestoreConstants.BUY_ORDERS_COLL)
  //     .doc(listId)
  //     .collection('orders');

  //   // Set id to hash
  //   buyOrder.id = this.obOrderHash(buyOrder);

  //   const doc = collection.doc(buyOrder.id);
  //   await doc.set(buyOrder);

  //   return (await doc.get()).data() as OBOrder;
  // }

  // // ===============================================================
  // // Sell orders

  // async sellOrders(listId: MarketListId, cursor?: string, limit?: number): Promise<OBOrder[]> {
  //   const orders = await this.orderMap(false, listId, cursor, limit);

  //   return Array.from(orders.values());
  // }

  // getCollection(buyOrder: boolean, listId: MarketListId): FirebaseFirestore.CollectionReference {
  //   return this.firebaseService.firestore
  //     .collection(buyOrder ? firestoreConstants.BUY_ORDERS_COLL : firestoreConstants.SELL_ORDERS_COLL)
  //     .doc(listId)
  //     .collection('orders');
  // }

  // async getOrder(buyOrder: boolean, listId: MarketListId, id: string) {
  //   const collection = this.getCollection(buyOrder, listId);

  //   return await collection.doc(id).get();
  // }

  // async orderMap(
  //   buyOrder: boolean,
  //   listId: MarketListId,
  //   cursor?: string,
  //   limit?: number
  // ): Promise<Map<string, OBOrder>> {
  //   const collection = this.getCollection(buyOrder, listId);

  //   let result: FirebaseFirestore.QuerySnapshot;
  //   let query: FirebaseFirestore.Query;
  //   if (limit && limit > 0) {
  //     query = collection.limit(limit);

  //     if (cursor) {
  //       // cursor is the order.id (last item of previous result)
  //       const doc = await this.getOrder(buyOrder, listId, cursor);
  //       query = query.startAfter(doc);
  //     }

  //     result = await query.get();
  //   } else {
  //     result = await collection.get();
  //   }

  //   if (result.docs) {
  //     const { results } = docsToArray(result.docs);

  //     const map: Map<string, OBOrder> = new Map();

  //     for (const order of results) {
  //       map.set(order.id, order);
  //     }

  //     return map;
  //   }

  //   return new Map<string, OBOrder>();
  // }

  // async sellOrdersWithParams(listId: MarketListId, collectionAddresses: string[]): Promise<OBOrder[]> {
  //   const result = await this.firebaseService.firestore
  //     .collection(firestoreConstants.SELL_ORDERS_COLL)
  //     .doc(listId)
  //     .collection('orders')
  //     // CollectionAddresses is added on save, it's not part of the OBOrder
  //     .where('collectionAddresses', 'array-contains-any', collectionAddresses)
  //     .get();

  //   if (result.docs) {
  //     const { results } = docsToArray(result.docs);

  //     return results;
  //   }

  //   return [];
  // }

  // async addSellOrder(listId: MarketListId, sellOrder: OBOrder): Promise<void> {
  //   const c = await this.orderMap(false, listId);

  //   if (!c.has(this.obOrderHash(sellOrder))) {
  //     await this.saveSellOrder(listId, sellOrder);
  //   } else {
  //     console.log(`deleteBuyOrder order not found ${this.obOrderHash(sellOrder)} ${listId}`);
  //   }
  // }

  // async saveSellOrder(listId: MarketListId, sellOrder: OBOrder): Promise<OBOrder> {
  //   const collection = this.firebaseService.firestore
  //     .collection(firestoreConstants.SELL_ORDERS_COLL)
  //     .doc(listId)
  //     .collection('orders');

  //   // Set id to hash
  //   sellOrder.id = this.obOrderHash(sellOrder);

  //   // Add collectionAddresses which is used for queries
  //   const collectionAddresses: string[] = [];
  //   for (const nft of sellOrder.nfts) {
  //     collectionAddresses.push(nft.collectionAddress);
  //   }
  //   const saveOrder = sellOrder as SellOrderSave;
  //   saveOrder.collectionAddresses = collectionAddresses;

  //   const doc = collection.doc(saveOrder.id);
  //   await doc.set(saveOrder);

  //   return (await doc.get()).data() as OBOrder;
  // }

  // // ===============================================================
  // // Expired orders

  // async expiredOrders(): Promise<ExpiredCacheItem[]> {
  //   const result: ExpiredCacheItem[] = [];

  //   result.push(...(await this.expiredBuyOrders(MarketListId.ValidActive)));
  //   result.push(...(await this.expiredBuyOrders(MarketListId.ValidInactive)));
  //   // Result.push(...(await expiredBuyOrders('invalid')));

  //   result.push(...(await this.expiredSellOrders(MarketListId.ValidActive)));
  //   result.push(...(await this.expiredSellOrders(MarketListId.ValidInactive)));
  //   // Result.push(...(await expiredSellOrders('invalid')));

  //   return result;
  // }

  // async expiredBuyOrders(listId: MarketListId): Promise<ExpiredCacheItem[]> {
  //   const result: ExpiredCacheItem[] = [];

  //   const orders = await this.buyOrders(listId);
  //   for (const order of orders) {
  //     if (isOBOrderExpired(order)) {
  //       result.push({ listId: listId, order: order });
  //     }
  //   }

  //   return result;
  // }

  // async expiredSellOrders(listId: MarketListId): Promise<ExpiredCacheItem[]> {
  //   const result: ExpiredCacheItem[] = [];

  //   const orders = await this.sellOrders(listId);
  //   for (const order of orders) {
  //     if (isOBOrderExpired(order)) {
  //       result.push({ listId: listId, order: order });
  //     }
  //   }

  //   return result;
  // }

  // // ============= utils =============

  // // todo: this needs to change
  // obOrderHash(obj: OBOrder): string {
  //   const copy = JSON.parse(JSON.stringify(obj));

  //   // we don't want the id part of the hash
  //   copy.id = undefined;

  //   // we don't want the currentPrice part of the hash
  //   // this is set on ActiveSellOrder
  //   copy.currentPrice = undefined;

  //   // added to to sell orders to help queries
  //   copy.collectionAddresses = undefined;

  //   let data = '';

  //   // JSON.stringify can have different results depending on order of keys
  //   // sort keys first
  //   const keys = Object.keys(copy).sort();
  //   for (const key of keys) {
  //     if (key === 'extraParams' || key === 'execParams') {
  //       continue;
  //     } else if (key === 'nfts') {
  //       const collectionAddresses = [];
  //       const ids = [];

  //       for (const item of obj.nfts) {
  //         collectionAddresses.push(item.collectionAddress);
  //         ids.push(...item.tokens);
  //       }

  //       collectionAddresses.sort();
  //       ids.sort((a, b) => {
  //         return a.tokenId.localeCompare(b.tokenId);
  //       });

  //       data += `cols: ${collectionAddresses.toString()}`;
  //       data += `ids: ${ids.toString()}`;
  //     } else {
  //       const val = copy[key];
  //       if (val) {
  //         data += `${key}: ${val.toString()}`;
  //       }
  //     }
  //   }
  //   return createHash('sha256').update(data).digest('hex').trim().toLowerCase();
  // }

  // areOBOrdersEqual(a: OBOrder, b: OBOrder): boolean {
  //   // use ids if set, id is hash
  //   if (a.id && b.id) {
  //     return a.id === b.id;
  //   }

  //   return this.obOrderHash(a) === this.obOrderHash(b);
  // }

  // async deleteOrder(orderId: string) {
  //   if (orderId) {
  //     try {
  //       const docRef = this.firebaseService.firestore.collection(firestoreConstants.ORDERS_COLL).doc(orderId);

  //       await docRef.delete();
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   } else {
  //     console.log('_deleteOrder, id is blank');
  //   }
  // }
}
