import { ChainId } from '@infinityxyz/lib/types/core';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEthereumAddress } from 'class-validator';
import { IsSupportedChainId } from 'common/decorators/IsSupportedChainId';
import { normalizeAddressTransformer } from 'common/transformers/normalize-address.transformer';

export class UserDto {
  @ApiProperty({
    description: 'User wallet address'
  })
  @IsEthereumAddress({
    message: 'Invalid address'
  })
  @Transform(normalizeAddressTransformer)
  readonly userAddress: string;

  @ApiProperty({
    description: 'Wallet chain id',
    enum: ChainId
  })
  @IsSupportedChainId({
    message: 'Invalid chainId'
  })
  readonly userChainId: ChainId;
}
