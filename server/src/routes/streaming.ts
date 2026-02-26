/**
 * Streaming Routes
 * 
 * Handles streaming of large files and real-time data
 */

import { Router, Request, Response, type IRouter } from 'express';
import { createReadStream, statSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router: IRouter = Router();

/**
 * Stream a video file with range support
 */
router.get('/video/:filename', (req: Request, res: Response) => {
  try {
    const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const videoPath = path.join(__dirname, '../../../assets/videos', filename);
    
    if (!existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const stat = statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      const stream = createReadStream(videoPath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      
      stream.pipe(res);
    } else {
      // No range, stream entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      
      createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Streaming error:', error);
    res.status(500).json({ error: 'Streaming failed' });
  }
});

/**
 * Stream large data as JSON
 */
router.get('/data', (req: Request, res: Response) => {
  const count = parseInt(req.query.count as string) || 1000;
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');
  
  res.write('[');
  
  for (let i = 0; i < count; i++) {
    const item = {
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.random() * 100,
      timestamp: new Date().toISOString(),
    };
    
    res.write(JSON.stringify(item));
    
    if (i < count - 1) {
      res.write(',');
    }
    
    // Simulate some processing delay
    if (i % 100 === 0) {
      // Small delay every 100 items
      const delay = 10;
      const start = Date.now();
      while (Date.now() - start < delay) {
        // Busy wait
      }
    }
  }
  
  res.write(']');
  res.end();
});

/**
 * Server-Sent Events (SSE) for real-time updates
 */
router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial event
  res.write('data: {"message": "Connected to event stream"}\n\n');
  
  // Send periodic updates
  const intervalId = setInterval(() => {
    const data = {
      timestamp: new Date().toISOString(),
      value: Math.random() * 100,
      message: 'Periodic update',
    };
    
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 2000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

/**
 * Download large file with progress tracking
 */
router.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const filePath = path.join(__dirname, '../../../assets/downloads', filename);
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stat = statSync(filePath);
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    
    const stream = createReadStream(filePath);
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('Stream error:', error);
      res.status(500).end();
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
