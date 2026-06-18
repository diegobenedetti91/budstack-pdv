import {
  Controller, Post, Get, UseInterceptors, UploadedFile,
  UseGuards, BadRequestException, ParseFilePipe, Param,
  Res, MaxFileSizeValidator,
} from '@nestjs/common'
import { Response } from 'express'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation, ApiBody } from '@nestjs/swagger'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { randomUUID } from 'crypto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Public } from '../../common/decorators/public.decorator'

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
    file: any,
  ) {
    const baseUrl = process.env.APP_URL ?? 'http://localhost:3001'
    return { url: `${baseUrl}/api/v1/uploads/${file.filename}`, filename: file.filename }
  }

  @Get(':filename')
  @Public()
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const fs = require('fs')
    const path = require('path')
    const uploadDir = path.join(__dirname, '..', '..', '..', 'public', 'uploads')
    const filepath = path.join(uploadDir, filename)

    // Validar path para prevenir directory traversal
    if (!path.resolve(filepath).startsWith(path.resolve(uploadDir))) {
      return res.status(403).send('Forbidden')
    }

    // Validar que o arquivo existe e é um arquivo válido
    if (!fs.existsSync(filepath) || !fs.statSync(filepath).isFile()) {
      return res.status(404).send('Not Found')
    }

    try {
      const stream = fs.createReadStream(filepath)
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=31536000')
      stream.pipe(res)
    } catch {
      res.status(404).send('Not Found')
    }
  }
}
