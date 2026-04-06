import { Controller, Get, Post, Put, Delete, Body, Param, Req, BadRequestException, Query, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './note.schema';
import { CreateNoteDto } from './create-note.dto';
import { UpdateNoteDto } from './update-note.dto';
import { LabelsService } from '../labels/labels.service';
import * as bcrypt from 'bcrypt';

@Controller('notes')
export class NotesController {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
    private readonly labelsService: LabelsService,
  ) { }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('search') search?: string,
  ): Promise<any[]> {
    const user = req.user.email;
    if (!user) {
      throw new BadRequestException('User not found in token');
    }
    const query: any = { user };
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    const notes = await this.noteModel.find(query).populate('label').exec();
    return notes.map(note => {
      const noteObj = note.toObject();
      const isProtected = !!noteObj.password;
      if (isProtected) {
        delete noteObj.content;
      }
      delete noteObj.password;
      return { ...noteObj, isProtected };
    });
  }

  @Get('by-label/:labelId')
  async findByLabel(@Param('labelId') labelId: string): Promise<any[]> {
    const notes = await this.noteModel.find({
      $or: [
        { label: labelId },
        { label: new Types.ObjectId(labelId) },
      ],
    }).populate('label').exec();

    return notes.map(note => {
      const noteObj = note.toObject();
      const isProtected = !!noteObj.password;
      if (isProtected) {
        delete noteObj.content;
      }
      delete noteObj.password;
      return { ...noteObj, isProtected };
    });
  }

  @Post()
  async create(@Req() req: any, @Body() createNoteDto: CreateNoteDto): Promise<Note> {
    const user = req.user.email;
    if (!user) {
      throw new BadRequestException('User not found in token');
    }

    const noteData: any = { ...createNoteDto, user };
    if (createNoteDto.password) {
      noteData.password = await bcrypt.hash(createNoteDto.password, 10);
    }

    const createdNote = new this.noteModel(noteData);
    return createdNote.save();
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto): Promise<Note | null> {
    const updateData: any = { ...updateNoteDto };
    if (updateNoteDto.password) {
      updateData.password = await bcrypt.hash(updateNoteDto.password, 10);
    } else if (updateNoteDto.password === "") {
      updateData.password = null;
    } else {
      delete updateData.password;
    }

    return this.noteModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  @Post(':id/unlock')
  async unlock(@Param('id') id: string, @Body('password') password: string): Promise<Note> {
    const note = await this.noteModel.findById(id).exec();
    if (!note) {
      throw new BadRequestException('Note not found');
    }

    if (!note.password) {
      return note;
    }

    const isMatch = await bcrypt.compare(password, note.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    const noteObj = note.toObject();
    delete noteObj.password;
    return noteObj;
  }

  @Delete('trash/empty')
  async emptyTrash(@Req() req: any): Promise<any> {
    const user = req.user.email;
    if (!user) {
      throw new BadRequestException('User not found in token');
    }
    return this.labelsService.emptyTrash(user);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Query('permanent') permanent?: string): Promise<any> {
    return this.labelsService.deleteNote(id, permanent === 'true');
  }
}