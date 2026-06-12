import {
  Controller, Post, UseInterceptors, UploadedFile,
  UseGuards, BadRequestException, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation, ApiBody } from '@nestjs/swagger'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { randomUUID } from 'crypto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './public/uploads'
    const fs = require('fs')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (_, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
})

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  @Post()
  @ApiOperation({ summary: 'Upload de imagem (máx 5MB, jpeg/png/webp)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { storage }))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    const baseUrl = process.env.APP_URL ?? 'http://localhost:3001'
    return { url: `${baseUrl}/uploads/${file.filename}`, filename: file.filename }
  }
}
