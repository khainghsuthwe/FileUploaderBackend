import { Router } from 'express';
import { uploadFile, getFiles } from '../controllers/uploadControllers';
import { upload } from '../middleware/multer';

const router = Router();

router.post('/', upload.single('image'), uploadFile);
router.get('/', getFiles);

export default router;