import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '../audio');

// Make sure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Ensure the user provided an API key
const API_KEY = process.argv[2];
if (!API_KEY) {
  console.error('❌ Error: Please provide your ElevenLabs API key.');
  console.error('Usage: node generate_mp3s.mjs YOUR_API_KEY');
  process.exit(1);
}

// We are now using 'Gigi' (jBpfuIE2acCO8z3wKNLl) which is a high-energy, expressive animation voice
const VOICE_ID = 'jBpfuIE2acCO8z3wKNLl';

// This is the current narration text from all scenes.
// If you change the story in the JS files later, update this array to regenerate the MP3s!
const narrations = [
  // Scene 0
  { id: 's0_b0', text: "Hey there! Ready to dive into the wild world of Time Series? Today we're cracking the code on Stationarity, MA, AR, and Differencing!" },
  { id: 's0_b1', text: "But first, meet our secret ingredient: White Noise! It's basically just a bunch of completely random, independent shocks bouncing around." },
  { id: 's0_b3', text: "Look at it! No trend, zero pattern, absolutely no memory. Every single point is a brand new dice roll." },
  { id: 's0_b4', text: "And if we check the ACF... boom. Nothing. All the bars are hiding safely inside the blue bands. No correlation at all!" },
  { id: 's0_b5', text: "Pretty boring, right? Let's spice things up and give this data some memory!" },

  // Scene 1
  { id: 's1_b0', text: "Say hello to the MA(1) model! Instead of just today's shock, we mix in a little bit of *yesterday's* shock too." },
  { id: 's1_b1', text: "So every point is looking exactly one step backwards. Just one tiny step of memory!" },
  { id: 's1_b2', text: "Check out the ACF now! Whoa, see that huge spike at lag 1?" },
  { id: 's1_b3', text: "But then... nothing! The memory totally vanishes after one step. That sharp cutoff is the ultimate signature of an MA model." },
  { id: 's1_b4', text: "Keep in mind, our sample won't look *perfectly* like the math formula. It's just one random timeline!" },
  { id: 's1_b5', text: "Go ahead, grab that slider! Mess with theta and watch how the spike reacts. Can you flip it?" },
  { id: 's1_b6', text: "So remember: MA(1) gives you one big ACF spike, and then... total silence." },

  // Scene 2
  { id: 's2_b0', text: "Okay, let's switch gears. What if today's value depends on *yesterday's actual value* instead of just the shock? That's the AR(1) model!" },
  { id: 's2_b1', text: "Look at it wander! Highs stay high, lows stay low... it's super stubborn. We call that persistence." },
  { id: 's2_b2', text: "And the ACF? It doesn't just chop off anymore. It slowly fades away like an echo." },
  { id: 's2_b3', text: "But wait, look at the PACF chart! One massive spike at lag 1, and then zero. That's how we know the order is exactly one!" },
  { id: 's2_b4', text: "Fading ACF means it's an AR model. A sharp PACF cutoff tells us the exact order. Simple!" },
  { id: 's2_b5', text: "Play with alpha! Drop it near zero and it acts like white noise. Push it to 0.95 and watch it get super sluggish." },
  { id: 's2_b6', text: "AR(1) wrap up: ACF fades out slowly, but PACF drops the mic after lag 1." },

  // Scene 3
  { id: 's3_b0', text: "Alright, real-world data almost always has a trend. But how does that mess with our ACF?" },
  { id: 's3_b2', text: "Whoa, look at that ACF! It looks like a super strong AR model, right? Nope! It's a total lie. The upward trend is creating fake memory." },
  { id: 's3_b3', text: "How do we fix it? We take the *first differences*. Basically, just subtract yesterday's value from today's." },
  { id: 's3_b4', text: "Hit that button to zap the trend!" },
  { id: 's3_b5', text: "Boom! Trend obliterated. Now the differenced ACF reveals the actual hidden structure of the noise." },
  { id: 's3_b6', text: "Golden rule: If you see a trend in the plot, always difference it *before* trusting the ACF!" },

  // Scene 4
  { id: 's4_b0', text: "A random walk with drift looks a lot like a trend, but it's totally unpredictable! It's basically yesterday's value plus a tiny drift, plus a random shock." },
  { id: 's4_b1', text: "Watch it go! Every single step builds on top of all the history before it." },
  { id: 's4_b2', text: "And just like the trend, it gives us that same massive, fake-out ACF chart." },
  { id: 's4_b3', text: "But when we difference it... magic! We get pure white noise bouncing around our drift of 0.3." },
  { id: 's4_b4', text: "Check the mean of those differences. It's almost exactly 0.3! Math works!" },
  { id: 's4_b5', text: "So, a random walk plus differencing equals plain old white noise. Easy!" },

  // Scene 5
  { id: 's5_b0', text: "Okay, final secret! No matter how hard you try, an MA(1) model can *never* have a lag-1 correlation bigger than 0.5. It's mathematically impossible!" },
  { id: 's5_b2', text: "The absolute peak is 0.5 when theta is exactly 1. And the floor is negative 0.5 when theta is negative 1." },
  { id: 's5_b3', text: "The AR(1) model doesn't have this problem! Its correlation isn't trapped by a denominator." },
  { id: 's5_b4', text: "Drag theta around that curve and watch how it gets trapped!" },
  { id: 's5_b5', text: "So remember: MA(1) is locked between plus or minus 0.5. AR(1) can go wild!" },
  { id: 's5_b6', text: "And that's a wrap on our lecture! You survived! Here's a quick recap of everything we just conquered." }
];

async function generateAudio(item) {
  const filePath = path.join(AUDIO_DIR, `${item.id}.mp3`);
  
  // We removed the skip check so it will overwrite your old 'Adam' audio files with the new voice
  console.log(`🎙️  Generating ${item.id}...`);

  const payload = JSON.stringify({
    text: item.text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  });

  const options = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${VOICE_ID}`,
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        console.error(`❌ Error from ElevenLabs for ${item.id}: Status ${res.statusCode}`);
        res.on('data', d => console.error(d.toString()));
        reject(new Error(`Status ${res.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`✅ Saved ${item.id}.mp3`);
        resolve();
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log(`Starting audio generation for ${narrations.length} beats...`);
  for (const item of narrations) {
    try {
      await generateAudio(item);
      // Brief pause to respect rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`Failed to generate ${item.id}:`, e.message);
    }
  }
  console.log('🎉 All done! Make sure you add the audioId fields to your scene files.');
}

run();
