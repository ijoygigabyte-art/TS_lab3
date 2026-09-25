import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const newTextMap = {
  // Scene 0
  's0_b0': "Hey there! Ready to dive into the wild world of Time Series? Today we're cracking the code on Stationarity, MA, AR, and Differencing!",
  's0_b1': "But first, meet our secret ingredient: White Noise! It's basically just a bunch of completely random, independent shocks bouncing around.",
  's0_b3': "Look at it! No trend, zero pattern, absolutely no memory. Every single point is a brand new dice roll.",
  's0_b4': "And if we check the ACF... boom. Nothing. All the bars are hiding safely inside the blue bands. No correlation at all!",
  's0_b5': "Pretty boring, right? Let's spice things up and give this data some memory!",

  // Scene 1
  's1_b0': "Say hello to the MA(1) model! Instead of just today's shock, we mix in a little bit of *yesterday's* shock too.",
  's1_b1': "So every point is looking exactly one step backwards. Just one tiny step of memory!",
  's1_b2': "Check out the ACF now! Whoa, see that huge spike at lag 1?",
  's1_b3': "But then... nothing! The memory totally vanishes after one step. That sharp cutoff is the ultimate signature of an MA model.",
  's1_b4': "Keep in mind, our sample won't look *perfectly* like the math formula. It's just one random timeline!",
  's1_b5': "Go ahead, grab that slider! Mess with theta and watch how the spike reacts. Can you flip it?",
  's1_b6': "So remember: MA(1) gives you one big ACF spike, and then... total silence.",

  // Scene 2
  's2_b0': "Okay, let's switch gears. What if today's value depends on *yesterday's actual value* instead of just the shock? That's the AR(1) model!",
  's2_b1': "Look at it wander! Highs stay high, lows stay low... it's super stubborn. We call that persistence.",
  's2_b2': "And the ACF? It doesn't just chop off anymore. It slowly fades away like an echo.",
  's2_b3': "But wait, look at the PACF chart! One massive spike at lag 1, and then zero. That's how we know the order is exactly one!",
  's2_b4': "Fading ACF means it's an AR model. A sharp PACF cutoff tells us the exact order. Simple!",
  's2_b5': "Play with alpha! Drop it near zero and it acts like white noise. Push it to 0.95 and watch it get super sluggish.",
  's2_b6': "AR(1) wrap up: ACF fades out slowly, but PACF drops the mic after lag 1.",

  // Scene 3
  's3_b0': "Alright, real-world data almost always has a trend. But how does that mess with our ACF?",
  's3_b2': "Whoa, look at that ACF! It looks like a super strong AR model, right? Nope! It's a total lie. The upward trend is creating fake memory.",
  's3_b3': "How do we fix it? We take the *first differences*. Basically, just subtract yesterday's value from today's.",
  's3_b4': "Hit that button to zap the trend!",
  's3_b5': "Boom! Trend obliterated. Now the differenced ACF reveals the actual hidden structure of the noise.",
  's3_b6': "Golden rule: If you see a trend in the plot, always difference it *before* trusting the ACF!",

  // Scene 4
  's4_b0': "A random walk with drift looks a lot like a trend, but it's totally unpredictable! It's basically yesterday's value plus a tiny drift, plus a random shock.",
  's4_b1': "Watch it go! Every single step builds on top of all the history before it.",
  's4_b2': "And just like the trend, it gives us that same massive, fake-out ACF chart.",
  's4_b3': "But when we difference it... magic! We get pure white noise bouncing around our drift of 0.3.",
  's4_b4': "Check the mean of those differences. It's almost exactly 0.3! Math works!",
  's4_b5': "So, a random walk plus differencing equals plain old white noise. Easy!",

  // Scene 5
  's5_b0': "Okay, final secret! No matter how hard you try, an MA(1) model can *never* have a lag-1 correlation bigger than 0.5. It's mathematically impossible!",
  's5_b2': "The absolute peak is 0.5 when theta is exactly 1. And the floor is negative 0.5 when theta is negative 1.",
  's5_b3': "The AR(1) model doesn't have this problem! Its correlation isn't trapped by a denominator.",
  's5_b4': "Drag theta around that curve and watch how it gets trapped!",
  's5_b5': "So remember: MA(1) is locked between plus or minus 0.5. AR(1) can go wild!",
  's5_b6': "And that's a wrap on our lecture! You survived! Here's a quick recap of everything we just conquered."
};

// 1. Update scene files
const SCENES_DIR = path.join(__dirname, '../js/scenes');
for (let i = 0; i <= 5; i++) {
  const file = path.join(SCENES_DIR, `scene${i}.js`);
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');
  
  for (const [id, newText] of Object.entries(newTextMap)) {
    if (id.startsWith(`s${i}_`)) {
      // Find the beat with this audioId and replace its narration
      // Regex matches: narration: "old text",\n      audioId: 'id'
      const regex = new RegExp(`narration:\\s*"[^"]+",\\s*audioId:\\s*'${id}'`, 'g');
      content = content.replace(regex, `narration: "${newText}",\n      audioId: '${id}'`);
    }
  }
  
  fs.writeFileSync(file, content);
  console.log(`Updated scene${i}.js`);
}

// 2. Update generate_mp3s.mjs
const generatorFile = path.join(__dirname, 'generate_mp3s.mjs');
if (fs.existsSync(generatorFile)) {
  let content = fs.readFileSync(generatorFile, 'utf8');
  
  for (const [id, newText] of Object.entries(newTextMap)) {
    // Regex matches: { id: 'sX_bY', text: "old text" }
    const regex = new RegExp(`{\\s*id:\\s*'${id}',\\s*text:\\s*"[^"]+"\\s*}`, 'g');
    content = content.replace(regex, `{ id: '${id}', text: "${newText}" }`);
  }
  
  fs.writeFileSync(generatorFile, content);
  console.log('Updated generate_mp3s.mjs');
}
