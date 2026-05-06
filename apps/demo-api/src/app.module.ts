import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { DemoAuthService } from './demo-auth.service.js';
import { DemoConfigService } from './demo-config.service.js';
import { DemoService } from './demo.service.js';

@Module({
  controllers: [AppController],
  providers: [DemoConfigService, DemoService, DemoAuthService],
})
export class AppModule {}
