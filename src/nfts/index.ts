require('dotenv').config();
import { ethers } from 'ethers';

import express from 'express';
const router = express.Router();

const utils = require('../../utils');
const constants = require('../../constants');
const firebaseAdmin = utils.getFirebaseAdmin();
const db = firebaseAdmin.firestore();

import { uploadSourceImages, testUpload, urlForDogeImage } from './doge_builder/images';

// todo: adi change this
const dogeAbi = require('./abis/doge2048nft.json');
// todo: adi change this
const factoryAbi = require('./abis/infinityFactory.json');

// todo: adi constants
const dogTokenAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

router.all('/u/*', async (req, res, next) => {
  const authorized = await utils.authorizeUser(
    req.path,
    req.header(constants.auth.signature),
    req.header(constants.auth.message)
  );
  if (authorized) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
});

// used for uploading the doge source images
// and testing creating and uploading an NFT based on metadata
// todo: adi remove in prod
router.get('/setup', async (req, res) => {
  try {
    await uploadSourceImages();
    res.send('uploaded');

    // const result = await testUpload();
    // res.send(result);
  } catch (err) {
    console.log(err);

    res.send(err);
  }
});

// api to get metadata
router.get('/:chain/:tokenAddress/:tokenId', async (req, res) => {
  const tokenAddress = req.params.tokenAddress.trim().toLowerCase();
  const tokenId = req.params.tokenId;
  const chain = req.params.chain.trim().toLowerCase();
  try {
    // read data from chain
    const chainId = utils.getChainId(chain);
    const provider = utils.getChainProvider(chainId);
    if (!provider) {
      utils.error('Chain provider is null for chain', chainId);
      res.sendStatus(500);
      return;
    }

    // todo: adi generalize this
    const factoryContract = new ethers.Contract(tokenAddress, factoryAbi, provider);
    const instanceAddress = await factoryContract.tokenIdToInstance(+tokenId);

    const contract = new ethers.Contract(instanceAddress, dogeAbi, provider);
    const score = await contract.score();
    const numPlays = await contract.numPlays();
    const dogBalance = await contract.getTokenBalance(dogTokenAddress);
    const finalDogBalance: number = dogBalance ? parseInt(ethers.utils.formatEther(dogBalance)) : 0;
    const url = await urlForDogeImage(score, numPlays, finalDogBalance);
    const result = { image: url, name: 'Doge 2048', description: 'NFT based 2048 game with much wow' };
    res.send(JSON.stringify(result));
  } catch (err) {
    utils.error('Failed fetching metadata for', tokenAddress, tokenId);
    utils.error(err);
    res.sendStatus(500);
  }
});

// api to get grid images
router.get('/doge2048/level-images', async (req, res) => {
  const { score, numPlays, dogBalance } = req.query;
  try {
    const finalScore: number = score ? parseInt(score as string) : 0;
    const finalNumPlays: number = numPlays ? parseInt(numPlays as string) : 1;
    const finalDogBalance: number = dogBalance ? parseInt(dogBalance as string) : 1;
    const url = await urlForDogeImage(finalScore, finalNumPlays, finalDogBalance);
    const result = { image: url };
    res.send(JSON.stringify(result));
  } catch (err) {
    utils.error('Failed fetching grid images');
    utils.error(err);
    res.sendStatus(500);
  }
});

export default router;
