const mongoose = require("mongoose");
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const pageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    enum: ["privacy-policy", "terms-of-service"],
  },
  title: {
    en: { type: String, required: true },
    he: { type: String, required: true }
  },
  content: {
    en: { type: String, required: true },
    he: { type: String, required: true }
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Sanitization middleware
pageSchema.pre('validate', function(next) {
  if (this.content.en) {
    this.content.en = DOMPurify.sanitize(this.content.en);
  }
  if (this.content.he) {
    this.content.he = DOMPurify.sanitize(this.content.he);
  }
  next();
});

module.exports = mongoose.model("Page", pageSchema);