import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Note, NoteSchema } from './note.schema';
import { NotesController } from './notes.controller';
import { LabelModule } from '../labels/label.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Note.name, schema: NoteSchema }]),
    LabelModule,
  ],
  controllers: [NotesController],
})
export class NoteModule {}