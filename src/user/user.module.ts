import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { StatsModule } from 'stats/stats.module';
import { VotesModule } from 'votes/votes.module';
import { CollectionsModule } from 'collections/collections.module';
import { StorageModule } from 'storage/storage.module';
import { DiscordModule } from 'discord/discord.module';
import { TwitterModule } from 'twitter/twitter.module';
import { UsernameService } from './username.service';

@Module({
  providers: [UserService, UsernameService],
  imports: [StatsModule, VotesModule, CollectionsModule, StorageModule, DiscordModule, TwitterModule],
  controllers: [UserController]
})
export class UserModule {}
