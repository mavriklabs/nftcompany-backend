import { SignedOBOrderSpec } from '@infinityxyz/lib/types/core';
import { Injectable } from '@nestjs/common';
import { error } from 'console';
import FirestoreBatchHandler from 'databases/FirestoreBatchHandler';
import { FirebaseService } from 'firebase/firebase.service';
import { getDocIdHash } from 'utils';

@Injectable()
export default class OrdersService {
  constructor(private firebaseService: FirebaseService) {}

  postOrders(orders: SignedOBOrderSpec[]) {
    const fsBatchHandler = new FirestoreBatchHandler();
    const ordersCollectionRef = this.firebaseService.firestore
      .collection('orders')
      .doc('all')
      .collection('validActive'); // todo: change to constants
    for (const order of orders) {
      const dataToStore = {
        id: order.id,
        chainId: order.chainId,
        isSellOrder: order.isSellOrder,
        numItems: order.numItems,
        startPrice: order.startPrice,
        startPriceEth: order.startPriceEth,
        endPrice: order.endPrice,
        endPriceEth: order.endPriceEth,
        startTime: order.startTime,
        endTime: order.endTime,
        minBpsToSeller: order.minBpsToSeller,
        nonce: order.nonce,
        complicationAddress: order.execParams.complicationAddress,
        currencyAddress: order.execParams.currencyAddress,
        makerAddress: order.makerAddress,
        makerUsername: order.makerUsername,
        takerAddress: order.takerAddress,
        takerUsername: order.takerUsername,
        signedOrder: order.signedOrder
      };
      // save
      const docRef = ordersCollectionRef.doc(order.id);
      fsBatchHandler.add(docRef, dataToStore, { merge: true });
      const orderItemsRef = docRef.collection('orderItems'); // todo: change to constants
      try {
        for (const nft of order.nftsWithMetadata) {
          const collection = nft.collectionAddress;
          for (const token of nft.tokens) {
            const tokenId = token.tokenId.toString();
            const orderItemData = {
              collection: collection,
              tokenId: tokenId,
              numTokens: 1
              // numTokens: parseInt(token.numTokens.toString())
            };
            const orderItemDocRef = orderItemsRef.doc(
              getDocIdHash({ collectionAddress: collection, tokenId, chainId: order.chainId.toString() })
            );
            fsBatchHandler.add(orderItemDocRef, orderItemData, { merge: true });
          }
        }
      } catch (err: any) {
        error('Failed saving orders to firestore', err);
      }
    }
    fsBatchHandler.flush().catch((err) => {
      error(err);
    });
  }
}
