import { WyvernAssetData } from './WyvernOrder';
import { Trait } from './Trait';

export interface Asset {
  title: string;
  traits: Trait[];
  searchTitle: string;
  traitValues: string[];
  numTraits: number;
  rawData: WyvernAssetData;
  collectionName: string;
  id: string;
  description: string;
  image: string;
  searchCollectionName: string;
  address: string;
  imagePreview: string;
  traitTypes: string[];
}
