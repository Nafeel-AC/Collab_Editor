import mongoose from 'mongoose';

const snippetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['javascript', 'typescript', 'html', 'css', 'jsx', 'python', 'java', 'c', 'cpp'],
    default: 'javascript'
  },
  category: {
    type: String,
    required: true,
    enum: ['general', 'functions', 'components', 'hooks', 'styles', 'utilities'],
    default: 'general'
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for faster querying
snippetSchema.index({ roomId: 1, category: 1 });
snippetSchema.index({ title: 'text', description: 'text', code: 'text' });

const Snippet = mongoose.model('Snippet', snippetSchema);

export default Snippet; 