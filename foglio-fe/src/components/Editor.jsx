import { useEditor, EditorContent } from "@tiptap/react";
import html2pdf from "html2pdf.js";
import StarterKit from "@tiptap/starter-kit";
import { CustomImage } from "../extensions/CustomImage";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Link } from "@tiptap/extension-link";
import { CustomTable, CustomTableView } from "../extensions/CustomTable";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useRef, useState, useEffect } from "react";
import {
  Check, Trash2, FileDown, FolderOpen, ImagePlus,
  CheckSquare, Plus, ArrowLeft, LogOut, Table2,
  AlignLeft, AlignCenter, AlignRight, Highlighter,
  Link2, X, FileText, User, Settings, Lock, ChevronDown,
  HardDrive, Mic, Eye, EyeOff
} from "lucide-react";
import { PdfEmbed } from "../extensions/PdfEmbed";
import { AudioEmbed } from "../extensions/AudioEmbed";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import HamburgerMenu from "./HamburgerMenu";
import FloatingButton from "./FloatingButton";
import { apiFetch } from "../utils/api";
import "../App.css";

const Editor = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showTableInputs, setShowTableInputs] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [noteTitle, setNoteTitle] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [labels, setLabels] = useState([]);
  const [savingNote, setSavingNote] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [currentView, setCurrentView] = useState("editor");
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [selectedLabelForNotes, setSelectedLabelForNotes] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notePassword, setNotePassword] = useState("");
  const [showNotePassword, setShowNotePassword] = useState(false);
  const openMarkdownFileInputRef = useRef(null);
  const uploadImageFileInputRef = useRef(null);
  const uploadPdfFileInputRef = useRef(null);
  const colorPickerInputRef = useRef(null);
  const userMenuRef = useRef(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  const fetchLabels = async () => {
    try {
      const response = await apiFetch(`/labels`, {
        headers: { user: user?.email },
      });
      const data = await response.json();
      setLabels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading labels:", err);
      toast.error("Error loading labels");
    }
  };

  useEffect(() => {
    fetchLabels();
    window.scrollTo(0, 0);
  }, [user]);

  const handleCreateLabelFromModal = async (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    setIsCreatingLabel(true);
    try {
      const response = await apiFetch("/labels", {
        method: "POST",
        body: JSON.stringify({ name: newLabelName.trim(), user: user?.email }),
      });

      if (!response.ok) {
        throw new Error("Error creating label");
      }

      const createdLabel = await response.json();
      toast.success("Label created successfully");
      setNewLabelName("");
      setShowCreateLabelModal(false);
      await fetchLabels();
      if (createdLabel?._id) {
        setSelectedLabel(createdLabel._id);
      }
    } catch (err) {
      console.error("Error creating label:", err);
      toast.error(err.message || "Error creating label");
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: true,
        link: false,
      }),
      CustomImage.configure({
        allowBase64: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown.configure({
        html: true,
        transformCopiedText: true,
        tightLists: true,
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      CustomTable.configure({
        resizable: true,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
        View: CustomTableView,
      }),
      TableRow,
      TableHeader,
      TableCell,
      PdfEmbed,
      AudioEmbed,
    ],
    content: "",
    onUpdate: () => { },
  });

  const addTable = () => {
    if (tableRows && tableCols) {
      editor
        .chain()
        .focus()
        .insertTable({
          rows: parseInt(tableRows),
          cols: parseInt(tableCols),
          withHeaderRow: true,
        })
        .insertContent("<p></p>")
        .run();
      setShowTableInputs(false);
      setShowTableMenu(false);
    }
  };

  const openMarkdown = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith(".md")) {
        toast.error("Please select a .md file");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        editor.chain().focus().setContent(content, true).run();
      };
      reader.readAsText(file);
      localStorage.setItem("filename", file.name.replace(".md", ""));
    }
    event.target.value = "";
  };

  const exportAsMarkdown = () => {
    if (!editor) return;
    if (!noteTitle) return;

    try {
      const markdownContent = editor.storage.markdown.getMarkdown();
      const blob = new Blob(
        [markdownContent],
        { type: "text/markdown" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${noteTitle}.md`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Error exporting note");
    }
  };

  const exportAsPDF = async () => {
    if (!editor) return;
    if (!noteTitle) {
      toast.error("Please insert a title for the note");
      return;
    }

    const htmlContent = editor.getHTML();

    const element = document.createElement("div");

    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h3 style="color: #000; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">${noteTitle}</h3>
        <div class="pdf-content">
          ${htmlContent}
        </div>
      </div>
      <style>
        .pdf-content table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        .pdf-content th, .pdf-content td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: middle; box-sizing: border-box; }
        .pdf-content th { background-color: #3b82f6; color: white; font-weight: bold; }
        .pdf-content th p, .pdf-content td p { margin: 0; padding: 0; line-height: 1.4; }
        .pdf-content ul[data-type="taskList"] { list-style: none; padding: 0; }
        .pdf-content ul[data-type="taskList"] li { display: flex; align-items: center; margin-bottom: 8px; }
        .pdf-content ul[data-type="taskList"] input[type="checkbox"] { margin-right: 10px; width: 16px; height: 16px; }
        .pdf-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; }
        .pdf-content blockquote { border-left: 4px solid #3b82f6; padding: 10px 20px; margin: 20px 0; background: #f9f9f9; font-style: italic; }
        .pdf-content pre { background: #f4f4f4; padding: 5px; border-radius: 6px; overflow-x: auto; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; }
        .pdf-content code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
      </style>
    `;

    const opt = {
      margin: 10,
      filename: `${noteTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 4, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      toast.loading("Generating PDF...", { id: "pdf-gen" });
      await html2pdf().from(element).set(opt).save();
      toast.success("PDF exported successfully", { id: "pdf-gen" });
    } catch (error) {
      console.error(error);
      toast.error("Error exporting PDF", { id: "pdf-gen" });
    }
  };

  const uploadFileToStorage = async (file, folder) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folder) {
      formData.append("folder", folder);
    }

    const response = await apiFetch("/files/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "File upload failed");
    }

    return await response.json();
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const toastId = toast.loading("Uploading image...");
    try {
      for (const file of files) {
        const data = await uploadFileToStorage(file, "images");
        editor
          .chain()
          .focus()
          .setImage({ src: data.url, alt: file.name })
          .focus()
          .run();
      }
      toast.success("Image uploaded to storage", { id: toastId });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Error uploading image", { id: toastId });
    } finally {
      event.target.value = "";
    }
  };

  const handlePdfUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const toastId = toast.loading("Uploading PDF...");
    try {
      for (const file of files) {
        if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
          toast.error("Please select only PDF files", { id: toastId });
          continue;
        }
        const data = await uploadFileToStorage(file, "documents");
        editor.view.focus();
        editor.chain().focus().setPdfEmbed({ src: data.url, title: file.name }).run();
      }
      toast.success("PDF embedded successfully!", { id: toastId });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error(error.message || "Error uploading PDF", { id: toastId });
    } finally {
      event.target.value = "";
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Microphone access is not supported by your browser");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        } else {
          mimeType = "";
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      toast.error("Could not access microphone: " + (err.message || "Permission denied"));
    }
  };

  const stopAndSaveRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    const toastId = toast.loading("Saving voice note to MinIO...");
    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      try {
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size === 0) {
          toast.error("Recording is empty", { id: toastId });
          return;
        }

        const fileName = `voice-note-${Date.now()}.${extension}`;
        const file = new File([audioBlob], fileName, { type: mimeType });

        const data = await uploadFileToStorage(file, "audio");
        const title = `Voice Note ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

        editor.view.focus();
        editor.chain().focus().setAudioEmbed({ src: data.url, title }).run();
        toast.success("Voice note saved!", { id: toastId });
      } catch (err) {
        console.error("Error saving voice note:", err);
        toast.error("Error saving voice note: " + (err.message || "Upload failed"), { id: toastId });
      } finally {
        setIsRecording(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
      }
    };

    recorder.stop();
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
    toast("Recording cancelled");
  };

  if (!editor) return null;

  const handleOpenMarkdownFileInputRef = () => {
    openMarkdownFileInputRef.current.click();
  };

  const handleUploadImageFileInputRef = () => {
    uploadImageFileInputRef.current.click();
  };

  const handleUploadPdfFileInputRef = () => {
    uploadPdfFileInputRef.current.click();
  };

  const handleColorPickerInputRef = () => {
    colorPickerInputRef.current.click();
  }

  const addLink = () => {
    const url = window.prompt("Enter URL:");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed");
    }
  };

  const handleLabelSelectForNotes = async (label) => {
    setSelectedLabelForNotes(label);
    setSelectedLabel(label._id);
    setLoadingNotes(true);
    try {
      const response = await apiFetch(`/notes/by-label/${label._id}`, {
        headers: { user: user?.email },
      });
      if (!response.ok) {
        throw new Error("Error loading notes");
      }
      const data = await response.json();
      setFilteredNotes(Array.isArray(data) ? data : []);
      setCurrentView("notes-list");
    } catch (err) {
      console.error("Error loading notes:", err);
      toast.error("Error loading notes");
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleNoteSelect = async (note) => {
    if (note.isProtected) {
      const password = window.prompt("This note is protected. Please enter the password:");
      if (!password) return;

      try {
        const response = await apiFetch(`/notes/${note._id}/unlock`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Invalid password");
          } else {
            throw new Error("Error unlocking note");
          }
          return;
        }

        const fullNote = await response.json();
        setCurrentNoteId(fullNote._id);
        setNoteTitle(fullNote.title);
        const labelId = fullNote.label && fullNote.label._id ? fullNote.label._id : fullNote.label;
        setSelectedLabel(labelId);
        setNotePassword("");
        editor.chain().focus().setContent(fullNote.content, true).run();
        setCurrentView("editor");
      } catch (err) {
        console.error("Error unlocking note:", err);
        toast.error("Error unlocking note");
      }
      return;
    }

    setCurrentNoteId(note._id);
    setNoteTitle(note.title);
    const labelId = note.label && note.label._id ? note.label._id : note.label;
    setSelectedLabel(labelId);
    setNotePassword("");
    editor.chain().focus().setContent(note.content, true).run();
    setCurrentView("editor");
  };

  const handleBackToEditor = () => {
    setCurrentView("editor");
    setFilteredNotes([]);
    setSelectedLabelForNotes(null);
    setSearchQuery("");
  };

  const handleCreateNewNote = () => {
    if (selectedLabelForNotes && selectedLabelForNotes.name.toLowerCase() !== "trash") {
      setSelectedLabel(selectedLabelForNotes._id);
    }
    setNoteTitle("");
    setNotePassword("");
    setCurrentNoteId(null);
    if (editor) {
      editor.chain().focus().clearContent().run();
    }
    setCurrentView("editor");
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim().length > 2) {
      setLoadingNotes(true);
      try {
        const response = await apiFetch(`/notes?search=${encodeURIComponent(value)}`, {
          headers: { user: user?.email },
        });
        if (!response.ok) throw new Error("Error searching notes");
        const data = await response.json();
        setFilteredNotes(Array.isArray(data) ? data : []);
        setCurrentView("notes-list");
        setSelectedLabelForNotes({ name: `Search results for: "${value}"` });
      } catch (err) {
        console.error("Search error:", err);
        toast.error("Error searching notes");
      } finally {
        setLoadingNotes(false);
      }
    } else if (value.trim() === "") {
      handleBackToEditor();
    }
  };

  const handleDeleteNote = async (noteId, labelName) => {
    const isTrash =
      selectedLabelForNotes?.name?.toLowerCase() === "trash" ||
      labelName?.toLowerCase() === "trash";

    if (isTrash) {
      const confirmDelete = window.confirm("Are you sure you want to permanently delete this note?");
      if (!confirmDelete) return;
    }

    try {
      const endpoint = isTrash ? `/notes/${noteId}?permanent=true` : `/notes/${noteId}`;
      const response = await apiFetch(endpoint, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error deleting note");

      if (!isTrash) {
        toast.success(`Note moved to Trash`);
      } else {
        toast.success(`Note permanently deleted`);
      }

      if (selectedLabelForNotes) {
        handleLabelSelectForNotes(selectedLabelForNotes);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting note");
    }
  };

  const handleEmptyTrash = async () => {
    if (!filteredNotes.length) return;
    const confirmDelete = window.confirm("Are you sure you want to permanently delete all notes in Trash?");
    if (!confirmDelete) return;

    try {
      const response = await apiFetch(`/notes/trash/empty`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error emptying Trash");

      toast.success("Trash emptied successfully");
      if (selectedLabelForNotes) {
        handleLabelSelectForNotes(selectedLabelForNotes);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error emptying Trash");
    }
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      toast.error("Please insert a title for the note");
      return;
    }

    if (!selectedLabel) {
      toast.error("Please select a label");
      return;
    }

    const markdownContent = editor.storage.markdown.getMarkdown();
    if (markdownContent.trim() === "") {
      toast.error("Please insert some content");
      return;
    }

    if (!editor) return;

    setSavingNote(true);
    try {
      const url = currentNoteId
        ? `${import.meta.env.VITE_API_BASE_URL}/notes/${currentNoteId}`
        : `${import.meta.env.VITE_API_BASE_URL}/notes`;
      const bodyPayload = {
        title: noteTitle,
        content: markdownContent,
        label: selectedLabel,
        user: user?.email,
      };
      if (notePassword) {
        bodyPayload.password = notePassword;
      }

      const method = currentNoteId ? "PUT" : "POST";
      const response = await apiFetch(url.replace(import.meta.env.VITE_API_BASE_URL, ""), {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        throw new Error("Error saving note");
      }

      const data = await response.json().catch(() => null);
      if (!currentNoteId && data?._id) {
        setCurrentNoteId(data._id);
      }

      toast.success(currentNoteId ? "Note updated" : "Note created");
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Error saving note");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="App-wrapper">
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
            <HamburgerMenu
              onLabelSelect={handleLabelSelectForNotes}
              selectedLabelId={selectedLabel}
              labels={labels}
              onLabelsChange={fetchLabels}
            />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={handleSearch}
              className="search-input-header"
            />
          </div>
          <div className="user-profile-container" ref={userMenuRef}>
            <button
              className="user-profile-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <User size={18} />
              <ChevronDown size={14} />
            </button>

            {showUserMenu && (
              <div className="user-dropdown-menu">
                <div
                  className="dropdown-user-btn"
                  title={user?.name || user?.email || "User"}
                >
                  <User size={14} />
                  <span>{user?.name || user?.email || "User"}</span>
                </div>
                <a
                  href="http://localhost:9001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dropdown-logout-btn"
                  style={{ textDecoration: "none", color: "inherit", marginBottom: "6px" }}
                >
                  <HardDrive size={14} />
                  <span>File Manager (MinIO)</span>
                </a>
                <button
                  onClick={handleLogout}
                  className="dropdown-logout-btn"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="editor-container">
        {currentView === "editor" ? (
          <>
            <div className="note-metadata">
              <div className="metadata-group">
                <input
                  type="text"
                  placeholder="Note title..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="note-title-input"
                />
                <div className="password-input-wrapper">
                  <Lock size={14} className="password-icon" />
                  <input
                    type={showNotePassword ? "text" : "password"}
                    placeholder="Password"
                    value={notePassword}
                    onChange={(e) => setNotePassword(e.target.value)}
                    className="note-password-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNotePassword(!showNotePassword)}
                    aria-label={showNotePassword ? "Hide password" : "Show password"}
                    title={showNotePassword ? "Hide password" : "Show password"}
                  >
                    {showNotePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <select
                  value={selectedLabel}
                  onChange={(e) => {
                    if (e.target.value === "__create_label__") {
                      setShowCreateLabelModal(true);
                    } else {
                      setSelectedLabel(e.target.value);
                    }
                  }}
                  className="note-label-select"
                >
                  <option value="">Select a label...</option>
                  {labels.filter((label) => label.name.toLowerCase() !== "trash").length === 0 && (
                    <option value="__create_label__">Create label</option>
                  )}
                  {labels
                    .filter((label) => label.name.toLowerCase() !== "trash")
                    .map((label) => (
                      <option key={label._id} value={label._id}>
                        {label.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote || !noteTitle.trim() || !selectedLabel}
                  className="save-note-btn"
                  title="Save"
                >
                  {savingNote ? "Saving..." : <><Check size={14} /> Save</>}
                </button>
              </div>
            </div>
            <div className="toolbar-wrapper">
              <div className="toolbar">
                <div className="toolbar-group">
                  <button
                    title="Bold"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`custom-button ${editor.isActive("bold") ? "is-active" : ""}`}
                  >
                    B
                  </button>
                  <button
                    title="Italic"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`custom-button ${editor.isActive("italic") ? "is-active" : ""}`}
                  >
                    I
                  </button>
                  <button
                    title="Heading 1"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                    className="custom-button"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    className="custom-button"
                    title="Text color"
                    onClick={handleColorPickerInputRef}
                  >
                    <input
                      type="color"
                      onInput={(event) =>
                        editor.chain().focus().setColor(event.target.value).run()
                      }
                      value={editor.getAttributes("textStyle").color || "#000000"}
                      title="Text Color"
                    />
                  </button>
                  <button
                    title="Task List"
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    className={`custom-button ${editor.isActive("taskList") ? "is-active" : ""}`}
                  >
                    <CheckSquare size={16} />
                  </button>
                  <button
                    title="Code Block"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`custom-button ${editor.isActive("codeBlock") ? "is-active" : ""}`}
                  >
                    {"</>"}
                  </button>
                  <button
                    title="Bullet List"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className="custom-button"
                  >
                    (•)
                  </button>
                  <button
                    type="button"
                    title="Upload Image"
                    className="custom-button"
                    onClick={handleUploadImageFileInputRef}
                  >
                    <ImagePlus size={16} />
                    <input
                      type="file"
                      ref={uploadImageFileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                    />
                  </button>
                  <button
                    type="button"
                    title="Upload PDF"
                    className="custom-button"
                    onClick={handleUploadPdfFileInputRef}
                  >
                    <FileText size={16} />
                    <input
                      type="file"
                      ref={uploadPdfFileInputRef}
                      accept="application/pdf,.pdf"
                      onChange={handlePdfUpload}
                      style={{ display: "none" }}
                    />
                  </button>
                  {!isRecording ? (
                    <button
                      type="button"
                      title="Record Voice Note"
                      className="custom-button"
                      onClick={startRecording}
                    >
                      <Mic size={16} />
                    </button>
                  ) : (
                    <div className="recording-bar" title="Recording voice note">
                      <div className="recording-dot"></div>
                      <span className="recording-time">{formatRecordingTime(recordingDuration)}</span>
                      <button
                        type="button"
                        onClick={stopAndSaveRecording}
                        className="recording-action-btn recording-stop-btn"
                        title="Save voice note"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="recording-action-btn recording-cancel-btn"
                        title="Cancel recording"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <button
                    className="custom-button"
                    onClick={() =>
                      editor.chain().focus().setTextAlign("left").run()
                    }
                    title="Align to Left"
                  >
                    <AlignLeft size={16} />
                  </button>
                  <button
                    className="custom-button"
                    onClick={() =>
                      editor.chain().focus().setTextAlign("center").run()
                    }
                    title="Align to Center"
                  >
                    <AlignCenter size={16} />
                  </button>
                  <button
                    className="custom-button"
                    onClick={() =>
                      editor.chain().focus().setTextAlign("right").run()
                    }
                    title="Align to Right"
                  >
                    <AlignRight size={16} />
                  </button>
                  <button
                    title="Mark"
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    className={`custom-button ${editor.isActive("highlight") ? "is-active" : ""}`}
                  >
                    <Highlighter size={16} />
                  </button>
                  <button
                    onClick={addLink}
                    className={`custom-button ${editor.isActive("link") ? "is-active" : ""}`}
                    title="Add Link"
                  >
                    <Link2 size={16} />
                  </button>
                  <button
                    className={`custom-button ${showTableMenu ? "is-active" : ""}`}
                    onClick={() => { setShowTableMenu(true); setShowTableInputs(true); }}
                    title="Insert Table"
                  >
                    <Table2 size={16} /> Table
                  </button>
                  <button
                    type="button"
                    className="custom-button"
                    title="Open Markdown"
                    onClick={handleOpenMarkdownFileInputRef}
                  >
                    <FolderOpen size={16} /> Open Markdown
                    <input
                      type="file"
                      ref={openMarkdownFileInputRef}
                      accept=".md"
                      onChange={openMarkdown}
                      style={{ display: "none" }}
                    />
                  </button>
                  <button
                    className="custom-button"
                    onClick={() => setShowExportModal(true)}
                    title="Export note"
                  >
                    <FileDown size={16} /> Export
                  </button>
                </div>
              </div>
            </div>

            <div
              className="editor-content"
              onClick={() => editor?.commands.focus()}
            >
              <EditorContent editor={editor} />
            </div>

            {showTableMenu && (
              <div className="table-modal-overlay" onClick={() => { setShowTableMenu(false); setShowTableInputs(false); }}>
                <div className="table-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="table-modal-header">
                    <h3>Table Menu</h3>
                    <button className="table-modal-close" onClick={() => { setShowTableMenu(false); setShowTableInputs(false); }}>
                      <X size={16} color="#ffffff" />
                    </button>
                  </div>
                  <div className="table-modal-body">
                    <button
                      className="custom-button"
                      onClick={() => setShowTableInputs(!showTableInputs)}
                    >
                      <Plus size={14} /> New Table
                    </button>

                    {showTableInputs && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '8px', backgroundColor: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '13px', color: '#555' }}>Rows:</label>
                          <input
                            type="number"
                            min="1"
                            value={tableRows}
                            onChange={(e) => setTableRows(e.target.value)}
                            style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '13px', color: '#555' }}>Columns:</label>
                          <input
                            type="number"
                            min="1"
                            value={tableCols}
                            onChange={(e) => setTableCols(e.target.value)}
                            style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                          />
                        </div>
                        <button
                          onClick={addTable}
                          style={{ marginTop: '4px', padding: '6px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                        >
                          Confirm
                        </button>
                      </div>
                    )}

                    {editor.isActive("table") && (
                      <>
                        <button
                          className="delete-text custom-button"
                          onClick={() => {
                            editor.chain().focus().deleteTable().run();
                            setShowTableMenu(false);
                          }}
                        >
                          <Table2 size={14} /> Delete Table
                        </button>
                        <div className="dropdown-divider"></div>
                        <div className="table-modal-row">
                          <button
                            className="custom-button"
                            onClick={() =>
                              editor.chain().focus().addColumnAfter().run()
                            }
                          >
                            <Plus size={14} /> Column
                          </button>
                          <button
                            className="delete-text custom-button"
                            onClick={() =>
                              editor.chain().focus().deleteColumn().run()
                            }
                          >
                            <X size={14} /> Column
                          </button>
                        </div>
                        <div className="table-modal-row">
                          <button
                            className="custom-button"
                            onClick={() =>
                              editor.chain().focus().addRowAfter().run()
                            }
                          >
                            <Plus size={14} /> Row
                          </button>
                          <button
                            className="delete-text custom-button"
                            onClick={() =>
                              editor.chain().focus().deleteRow().run()
                            }
                          >
                            <X size={14} /> Row
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            {showExportModal && (
              <div className="table-modal-overlay" onClick={() => setShowExportModal(false)}>
                <div className="table-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="table-modal-header">
                    <h3>Export Note</h3>
                    <button className="table-modal-close" onClick={() => setShowExportModal(false)}>
                      <X size={16} color="#ffffff" />
                    </button>
                  </div>
                  <div className="table-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ color: '#555', fontSize: '14px', marginBottom: '8px' }}>Choose your preferred export format:</p>
                    <button
                      className="custom-button"
                      onClick={() => { exportAsMarkdown(); setShowExportModal(false); }}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <FileDown size={14} /> Export Markdown
                    </button>
                    <button
                      className="custom-button"
                      onClick={() => { exportAsPDF(); setShowExportModal(false); }}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <FileText size={14} /> Export PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showCreateLabelModal && (
              <div className="table-modal-overlay" onClick={() => setShowCreateLabelModal(false)}>
                <div className="table-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                  <div className="table-modal-header">
                    <h3>Create label</h3>
                    <button className="table-modal-close" onClick={() => setShowCreateLabelModal(false)}>
                      <X size={16} color="#ffffff" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateLabelFromModal}>
                    <div className="table-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>
                        Enter a name for the new label:
                      </p>
                      <input
                        type="text"
                        placeholder="Label name..."
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        className="note-title-input"
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          color: '#000000',
                          backgroundColor: '#ffffff',
                          border: '1px solid #94a3b8'
                        }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          className="custom-button"
                          onClick={() => setShowCreateLabelModal(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingLabel || !newLabelName.trim()}
                          className="save-note-btn"
                          style={{ padding: '0.5rem 1.2rem' }}
                        >
                          {isCreatingLabel ? "Creating..." : "Create"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="notes-list-view">
            <div className="notes-list-header">
              <h2>{selectedLabelForNotes?.name}</h2>
              {selectedLabelForNotes?.name?.toLowerCase() === "trash" &&
                filteredNotes.length > 0 && (
                  <button
                    className="empty-trash-btn"
                    onClick={handleEmptyTrash}
                  >
                    <Trash2 size={16} />
                    <span>Empty Trash</span>
                  </button>
                )}
            </div>
            {loadingNotes && <p className="loading">Loading notes...</p>}
            {!loadingNotes && filteredNotes.length === 0 && (
              selectedLabelForNotes?.name?.toLowerCase() === "trash" ? (
                <p className="empty">Empty Trash</p>
              ) : (
                <p className="empty">No notes found for this label</p>
              )
            )}
            {!loadingNotes && filteredNotes.length > 0 && (
              <div className="notes-grid">
                {filteredNotes.map((note) => {
                  const isTrash = selectedLabelForNotes?.name?.toLowerCase() === "trash";
                  return (
                    <div
                      key={note._id}
                      className="note-card"
                    >
                      <div className="note-header" onClick={() => handleNoteSelect(note)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 className="note-title">{note.title}</h3>
                          {note.isProtected && <Lock size={14} className="lock-icon" />}
                        </div>
                        <p className="note-date">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {isTrash ? (
                        <button
                          className="permanent-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note._id, note.label?.name || "Trash");
                          }}
                          title="Delete permanently"
                        >
                          <Trash2 size={14} />
                          <span>Delete permanently</span>
                        </button>
                      ) : (
                        <button
                          className="delete-note-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note._id, note.label?.name);
                          }}
                          title="Move to Trash"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <FloatingButton onClick={handleCreateNewNote} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;
