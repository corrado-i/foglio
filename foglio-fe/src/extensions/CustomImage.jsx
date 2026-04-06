import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { Trash2, ExternalLink } from 'lucide-react';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';

const extractFilename = (url) => {
  if (!url) return null;
  const match = url.match(/\/files\/([^#?]+)/);
  return match ? match[1] : null;
};

const ImageNodeView = ({ node, deleteNode }) => {
  const { src, alt } = node.attrs;

  const handleDelete = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (src) {
      const filename = extractFilename(src);
      if (filename) {
        try {
          await apiFetch(`/files/${filename}`, { method: 'DELETE' });
          toast.success("Image deleted");
        } catch (err) {
          console.error("Error deleting image:", err);
        }
      }
    }
    deleteNode();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      handleDelete(e);
    }
  };

  return (
    <NodeViewWrapper
      className="editor-image-wrapper"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      contentEditable={false}
    >
      <div className="editor-image-container">
        <div className="editor-image-toolbar">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="pdf-action-btn"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
            <span>Open</span>
          </a>
          <button
            type="button"
            onClick={handleDelete}
            className="pdf-action-btn pdf-delete-btn"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <img
          src={src}
          alt={alt || ''}
          className="editor-image-element"
        />
      </div>
    </NodeViewWrapper>
  );
};

export const CustomImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
          ({ commands }) => {
            return commands.insertContent([
              {
                type: this.name,
                attrs: options,
              },
              {
                type: 'paragraph',
              },
            ]);
          },
    };
  },
});

