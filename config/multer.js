import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // keep original extension
    const base = path.basename(file.originalname, ext);

    const safeName = base.replace(/\s+/g, "-").toLowerCase();

    cb(null, `${safeName}-${Date.now()}${ext}`);
  },
});

export const upload = multer({ storage });
