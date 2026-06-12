import {
  Controller, Post, Get, UseInterceptors, UploadedFile,
  UseGuards, BadRequestException, ParseFilePipe, Param,
  Res,
} from '@nestjs/common'
import { Response } from 'express'
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
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
    return { url: `${baseUrl}/api/v1/uploads/${file.filename}`, filename: file.filename }
  }

  @Get(':filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const { createReadStream } = require('fs')
    const uploadPath = './public/uploads'
    const filepath = require('path').join(uploadPath, filename)

    // Validar path para prevenir directory traversal
    if (!filepath.startsWith(require('path').resolve(uploadPath))) {
      return res.status(403).send('Forbidden')
    }

    try {
      const stream = createReadStream(filepath)
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=31536000')
      stream.pipe(res)
    } catch {
      res.status(404).send('Not Found')
    }
  }
}
