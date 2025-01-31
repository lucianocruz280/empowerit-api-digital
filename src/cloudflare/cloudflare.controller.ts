import { Controller, Post, Body } from '@nestjs/common';
import { CloudflareService } from './cloudflare.service';

@Controller('cloudflare')
export class CloudflareController {
  constructor(private readonly cloudflareService: CloudflareService) {}

  @Post('uploadVideo')
  uploadVideo(@Body() body) {
    return this.cloudflareService.getUploadVideoUrl(
      body.courseId,
      body.folder,
      body.courseType,
    );
  }
}
