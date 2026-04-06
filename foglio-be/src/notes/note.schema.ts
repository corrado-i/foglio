import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Label } from '../labels/label.schema';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content?: string;

  @Prop({ type: Types.ObjectId, ref: 'Label' })
  label: Types.ObjectId;

  @Prop({ required: true })
  user: string;

  @Prop()
  password?: string;
}

export const NoteSchema = SchemaFactory.createForClass(Note);