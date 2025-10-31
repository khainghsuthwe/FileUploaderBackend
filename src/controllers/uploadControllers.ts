import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

export const uploadFile = (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
        message: 'File uploaded successfully!',
        file: {
            filename: req.file.filename,
            url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`
        }
    });
};

export const getFiles = (req: Request, res: Response) => {
    const baseUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/`;
    fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to read uploads' });

        const imageFiles = files.filter(f => /\.(jpe?g|png|gif)$/i.test(f));
        const fileList = imageFiles.map(f => ({
            filename: f,
            url: `${baseUrl}${f}`
        }));

        res.json({ files: fileList });
    });
};