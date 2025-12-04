const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = 3333;

// Serve quran-data files
app.use('/enhanced', express.static(path.join(__dirname, '..', 'quran-data', 'enhanced')));
app.use('/audio', express.static(path.join(__dirname, '..', 'quran-data', 'audio')));
app.use('/surah-timings', express.static(path.join(__dirname, '..', 'quran-data', 'surah-timings')));
app.use('/complete-timings', express.static(path.join(__dirname, '..', 'quran-data', 'complete-timings')));

// Serve static files from tools directory
app.use(express.static(__dirname));


// Add this new endpoint to save enhanced data
app.post('/api/save-enhanced', (req, res) => {
    const { surahNumber, verseNumber, enhancedSegments } = req.body;
    
    try {
        const surahNum = String(surahNumber).padStart(3, '0');
        const enhancedPath = path.join(__dirname, '..', 'quran-data', 'enhanced', `${surahNum}.json`);
        
        // Read existing enhanced file
        let enhancedData = JSON.parse(fs.readFileSync(enhancedPath, 'utf8'));
        
        // Find and update the specific verse
        const verseIndex = enhancedData.verses.findIndex(v => v.key === `${surahNumber}:${verseNumber}`);
        
        if (verseIndex >= 0) {
            // Update the segments
            enhancedData.verses[verseIndex].segments = enhancedSegments;
            console.log(`Updated enhanced data for verse ${verseNumber} with ${enhancedSegments.length} segments`);
            
            // Save back to file
            fs.writeFileSync(enhancedPath, JSON.stringify(enhancedData, null, 2));
            
            res.json({ 
                success: true, 
                message: `Enhanced data saved for Verse ${verseNumber}`
            });
        } else {
            res.status(404).json({ success: false, error: 'Verse not found in enhanced file' });
        }
        
    } catch (error) {
        console.error('Error saving enhanced data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update the existing save-timing endpoint to handle both
app.post('/api/save-timing', (req, res) => {
    const { surahNumber, verseNumber, segments, enhancedSegments } = req.body;
    
    try {
        const surahNum = String(surahNumber).padStart(3, '0');
        
        // Save timing data (existing code)
        const timingPath = path.join(__dirname, '..', 'quran-data', 'complete-timings', `surah_${surahNum}_complete.json`);
        let allTimings = [];
        if (fs.existsSync(timingPath)) {
            allTimings = JSON.parse(fs.readFileSync(timingPath, 'utf8'));
        }
        
        const verseIndex = allTimings.findIndex(v => v.verseNumber == verseNumber);
        if (verseIndex >= 0) {
            allTimings[verseIndex].segments = segments;
        } else {
            return res.status(404).json({ success: false, error: 'Verse not found in timing file' });
        }
        
        fs.writeFileSync(timingPath, JSON.stringify(allTimings, null, 2));
        
        // ALSO save enhanced segments if provided
        if (enhancedSegments) {
            const enhancedPath = path.join(__dirname, '..', 'quran-data', 'enhanced', `${surahNum}.json`);
            let enhancedData = JSON.parse(fs.readFileSync(enhancedPath, 'utf8'));
            
            const enhancedVerseIndex = enhancedData.verses.findIndex(v => v.key === `${surahNumber}:${verseNumber}`);
            if (enhancedVerseIndex >= 0) {
                enhancedData.verses[enhancedVerseIndex].segments = enhancedSegments;
                fs.writeFileSync(enhancedPath, JSON.stringify(enhancedData, null, 2));
                console.log(`Updated both timing and enhanced data for verse ${verseNumber}`);
            }
        }
        
        res.json({ 
            success: true, 
            message: `All data saved for Surah ${surahNumber}, Verse ${verseNumber}`,
            file: `surah_${surahNum}_timings.json`
        });
        
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add this new endpoint before app.listen
app.post('/api/split-audio', async (req, res) => {
    const { surahNumber, verseNumber, segments } = req.body;
    
    try {
        const surahNum = String(surahNumber).padStart(3, '0');
        const verseNum = String(verseNumber).padStart(3, '0');
        
        // Source audio file
        const sourceAudio = path.join(__dirname, '..', 'quran-data', 'audio', surahNum, `${surahNum}${verseNum}.mp3`);
        
        // Check if source audio exists
        if (!fs.existsSync(sourceAudio)) {
            return res.status(404).json({ 
                success: false, 
                error: `Source audio not found: ${sourceAudio}` 
            });
        }
        
        // Output directory for segment audio
        const outputDir = path.join(__dirname, '..', 'quran-data', 'audio', surahNum, 'segments');
        
        // Create segments directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        console.log(`\n🔪 Splitting audio for Surah ${surahNum}, Verse ${verseNum}...`);
        
        // Split audio for each segment
        const splitPromises = segments.map(async (segment) => {
            const outputFile = path.join(outputDir, `${surahNum}${verseNum}_seg${segment.segmentNumber}.mp3`);
            
            // ffmpeg command to extract segment
            const duration = (segment.end - segment.start).toFixed(3);
            const command = `ffmpeg -i "${sourceAudio}" -ss ${segment.start} -t ${duration} -acodec copy -y "${outputFile}"`;
            
            console.log(`  Segment ${segment.segmentNumber}: ${segment.start}s to ${segment.end}s`);
            
            try {
                await execPromise(command);
                console.log(`  ✅ Created: ${path.basename(outputFile)}`);
                return {
                    segmentNumber: segment.segmentNumber,
                    audioFile: `${surahNum}/segments/${surahNum}${verseNum}_seg${segment.segmentNumber}.mp3`,
                    success: true
                };
            } catch (error) {
                console.error(`  ❌ Failed segment ${segment.segmentNumber}:`, error.message);
                return {
                    segmentNumber: segment.segmentNumber,
                    success: false,
                    error: error.message
                };
            }
        });
        
        const results = await Promise.all(splitPromises);
        const allSuccessful = results.every(r => r.success);
        
        if (allSuccessful) {
            // Update timing data with audio file paths
            const timingPath = path.join(__dirname, '..', 'quran-data', 'complete-timings', `surah_${surahNum}_complete.json`);
            if (fs.existsSync(timingPath)) {
                let allTimings = JSON.parse(fs.readFileSync(timingPath, 'utf8'));
                const verseIndex = allTimings.findIndex(v => v.verseNumber == verseNumber);
                
                if (verseIndex >= 0 && allTimings[verseIndex].segments) {
                    allTimings[verseIndex].segments.forEach((seg, idx) => {
                        if (results[idx]) {
                            seg.audioFile = results[idx].audioFile;
                        }
                    });
                    fs.writeFileSync(timingPath, JSON.stringify(allTimings, null, 2));
                    console.log(`✅ Updated timing data with audio file paths\n`);
                }
            }
            
            res.json({
                success: true,
                message: `Successfully split audio into ${segments.length} segments`,
                files: results.map(r => r.audioFile)
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Some segments failed to split',
                results
            });
        }
        
    } catch (error) {
        console.error('Error splitting audio:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n✅ Segment server running at http://localhost:${PORT}`);
    console.log(`📝 Open http://localhost:${PORT}/segment-editor.html to edit segments\n`);
});