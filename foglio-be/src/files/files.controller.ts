import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { Public } from '../auth/public.decorator';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'application/pdf',
          'audio/webm',
          'audio/mp4',
          'audio/ogg',
          'audio/wav',
          'audio/mpeg',
          'audio/mp3',
          'audio/aac',
          'audio/x-m4a',
        ];
        if (
          allowedMimes.includes(file.mimetype) ||
          file.mimetype.startsWith('image/') ||
          file.mimetype.startsWith('audio/') ||
          file.originalname.toLowerCase().endsWith('.pdf') ||
          /\.(jpe?g|png|gif|webp|svg|bmp|ico|tiff|avif)$/i.test(file.originalname) ||
          /\.(webm|mp3|wav|ogg|m4a|aac|flac)$/i.test(file.originalname)
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Only images, PDF and audio files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.filesService.uploadFile(file, folder);
  }

  @Public()
  @Get(':folder/:filename')
  async getFolderFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const objectKey = `${folder}/${filename}`;
    return this.serveFile(objectKey, filename, res);
  }

  @Public()
  @Get(':filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFile(filename, filename, res);
  }

  @Delete(':folder/:filename')
  async deleteFolderFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
  ) {
    const objectKey = `${folder}/${filename}`;
    await this.filesService.deleteFile(objectKey);
    return { success: true, message: `File ${objectKey} deleted` };
  }

  @Delete(':filename')
  async deleteFile(@Param('filename') filename: string) {
    await this.filesService.deleteFile(filename);
    return { success: true, message: `File ${filename} deleted` };
  }

  private async serveFile(objectKey: string, filename: string, res: Response) {
    const { stream, stat } = await this.filesService.getFileStream(objectKey);

    const lowerName = filename.toLowerCase();
    const contentType =
      stat.metaData?.['content-type'] ||
      (lowerName.endsWith('.pdf')
        ? 'application/pdf'
        : lowerName.endsWith('.webm')
        ? 'audio/webm'
        : lowerName.endsWith('.mp3')
        ? 'audio/mpeg'
        : lowerName.endsWith('.wav')
        ? 'audio/wav'
        : lowerName.endsWith('.ogg')
        ? 'audio/ogg'
        : lowerName.endsWith('.m4a')
        ? 'audio/mp4'
        : lowerName.endsWith('.png')
        ? 'image/png'
        : lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')
        ? 'image/jpeg'
        : lowerName.endsWith('.gif')
        ? 'image/gif'
        : lowerName.endsWith('.webp')
        ? 'image/webp'
        : lowerName.endsWith('.svg')
        ? 'image/svg+xml'
        : 'application/octet-stream');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    if (stat.size) {
      res.setHeader('Content-Length', stat.size);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    stream.pipe(res);
  }
}

