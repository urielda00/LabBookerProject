// controllers/pageController.js
const Page = require("../models/Pages");
const R    = require("../utils/response");

exports.getPage = async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug })
      .select("slug title content updatedAt lastUpdatedBy")
      .populate("lastUpdatedBy", "name email role");

    if (!page) {
      // 404 + i18n key
      return R.send(req, res, 404, "page.errors.notFound");
    }

    const lang = req.language || "en";
    const payload = {
      exists: true,
      slug: page.slug,
      translations: {
        title:   page.title,
        content: page.content,
      },
      lastUpdated:   page.updatedAt,
      lastUpdatedBy: page.lastUpdatedBy,
    };

    return R.send(req, res, 200, null, {}, payload);
  } catch (error) {
    console.error("getPage error:", error);
    return R.send(req, res, 500, "page.errors.serverError", { error: error.message });
  }
};

exports.updatePage = async (req, res) => {
  try {
    const { title, content } = req.body;

    // require both EN & HE
    if (
      !title       ||
      !content     ||
      !title.en    ||
      !title.he    ||
      !content.en  ||
      !content.he
    ) {
      return R.send(req, res, 400, "page.errors.missingTranslations");
    }

    const existingPage = await Page.findOne({ slug: req.params.slug });

    const updateData = {
      title: {
        en: title.en,
        he: title.he,
      },
      content: {
        en: content.en,
        he: content.he,
      },
      lastUpdatedBy: req.user._id,
    };

    const page = await Page.findOneAndUpdate(
      { slug: req.params.slug },
      updateData,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).populate("lastUpdatedBy", "name email role");

    const payload = {
      slug: page.slug,
      translations: {
        title:   page.title,
        content: page.content,
      },
      lastUpdated:   page.updatedAt,
      lastUpdatedBy: page.lastUpdatedBy,
    };

    return R.send(req, res, 200, "page.success.updated", {}, payload);
  } catch (error) {
    console.error("updatePage error:", error);
    return R.send(req, res, 500, "page.errors.updateFailed", { error: error.message });
  }
};
