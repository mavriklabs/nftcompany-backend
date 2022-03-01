/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
// this doc outlines the high level data structure of firestore
/*

1. collections
    |__1:0x05844e9ae606f9867ae2047c93cac370d54ab2e1 <chainId:collectionAddress in lowercase>
       |__{data}
       |__nfts
          |__1559 <tokenId>
             |__{data}

2. feed
    |__1:AAbghuuiIU <chainId:firestore uuid>
       |__{data}

3. users
    |__1:0xc844c8e1207b9d3c54878c849a431301ba9c23e0 <chainId:userAddress in lowercase>
       |__{data}
       |__collectionFollows
          |__1:0x05844e9ae606f9867ae2047c93cac370d54ab2e1 <chainId:collectionAddress in lowercase>
             |__{data}
       |__userFollows
          |__1:0xc844c8e1207b9d3c54878c849a431301ba9c23e0 <chainId:userAddress in lowercase>
             |__{data}

4. sales
    |__1:AAbghuuiIU <chainId:firestore uuid>
       |__{data}

5. listings
    |__dceafaaghiuyt <hash(chainId:collectionAddress:tokenId)>
       |__{data}
       |__validActive
          |__AAbghuuiIU <firestore uuid>
             |__{data}
       |__validInactive
          |__AAbghuuiIU <firestore uuid>
             |__{data}
       |__invalid
          |__AAbghuuiIU <firestore uuid>
             |__{data}

6. offers
    |__dceafaaghiuyt <hash(chainId:collectionAddress:tokenId)>
       |__{data}
       |__validActive
          |__AAbghuuiIU <firestore uuid>
             |__{data}
       |__validInactive
          |__AAbghuuiIU <firestore uuid>
             |__{data}
       |__invalid
          |__AAbghuuiIU <firestore uuid>
             |__{data}

7. collection-stats
    |__1:0x05844e9ae606f9867ae2047c93cac370d54ab2e1 <chainId:collectionAddress>
       |__{data}
       |__hourly
          |__hh-dd-mm-yyyy
             |__{data}
       |__daily
          |__dd-mm-yyyy
             |__{data}
       |__monthly
          |__mm-yyyy
             |__{data}
       |__yearly
          |__yyyy
             |__{data}

8. nft-stats
    |__dceafaaghiuyt <hash(chainId:collectionAddress:tokenId)>
       |__{data}

9. assets
    |__dceafaaghiuyt <hash(chainId:collectionAddress:tokenId)>
       |__{data}
    
*/
