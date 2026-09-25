const fs = require('fs');
const path = require('path');
const dir = 'e:/SEM3/TS_5306/lab3/js/scenes';

function updateNarrations(file, newNarrations) {
  let p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  let match;
  let i = 0;
  // Regex to match narration: "..." or narration: '...'
  const regex = /narration:\s*(['"])(.*?)\1/g;
  content = content.replace(regex, (fullMatch, quote, oldText) => {
    if (i < newNarrations.length) {
      const newText = newNarrations[i].replace(/'/g, '\\\'');
      i++;
      return `narration: '${newText}'`;
    }
    return fullMatch;
  });
  fs.writeFileSync(p, content, 'utf8');
}

updateNarrations('scene1.js', [
  'Welcome to the next chapter. Say hello to the Moving Average model, or MA 1. Instead of just today’s random shock, we mix in a little bit of yesterday’s shock, too.',
  'Notice how every single point is looking exactly one step backwards? It has just one tiny step of memory connecting it to the past.',
  'Now watch what happens to the ACF. Boom! Do you see that massive spike at lag 1?',
  'But immediately after that... nothing. The memory totally vanishes. That sharp cutoff is the ultimate signature of an MA model.',
  'Keep in mind, real data won’t look perfectly like the math formula. It’s just one random timeline bouncing around.',
  'Go ahead, grab that slider! Mess with the theta value and watch how that spike reacts. Can you flip it upside down?',
  'So remember the story here: an MA 1 gives you one big ACF spike, and then, total silence.'
]);

updateNarrations('scene2.js', [
  'Alright, let’s level up. What if we don’t just remember yesterday’s shock, but we remember yesterday’s actual value? Welcome to the AR 1 model.',
  'Here, the current value is explicitly dragged along by the previous one. It creates these long, swooping waves in the data.',
  'Look at the ACF now. It doesn’t just cut off. It decays slowly, like an echo fading away in a canyon.',
  'But how do we know it’s just looking one step back? That’s where our new tool, the PACF, comes in. Watch this.',
  'The PACF strips away the echoes. And boom! We see one clear spike at lag 1, and then nothing. It cuts through the noise to find the true source.',
  'Try playing with the phi slider. See how a higher phi makes those echoes last way longer?',
  'The takeaway: AR models have fading ACF echoes, but sharp, clean PACF cutoffs. It’s all about finding the root cause.'
]);

updateNarrations('scene3.js', [
  'What if the memory goes even deeper? Let’s push it to an AR 2 model. Now we are looking two full steps into the past.',
  'With two points of memory, the data can start to do something magical: it can oscillate, swinging back and forth like a pendulum.',
  'Look at the ACF. Instead of a simple fade, it’s creating a beautiful dampening wave. It’s literally echoing back and forth.',
  'But again, the ACF is too messy. We need the PACF to give us the hard truth.',
  'And there it is! Exactly two sharp spikes on the PACF, telling us loud and clear: this is an AR 2 process.',
  'Try adjusting both sliders. You can make it swing wildly, or smooth it out into a gentle drift.',
  'When you see a wavy ACF and exactly two spikes on the PACF, you’ve caught an AR 2 in the wild.'
]);

updateNarrations('scene4.js', [
  'Okay, let’s talk about the elephant in the room: Non-stationarity. This is the Random Walk.',
  'Notice how it wanders off and never comes back to the center? It has zero gravity. It’s untethered.',
  'Look at its ACF. The bars stay agonizingly high and refuse to drop. That’s a massive red flag. You cannot model this as is.',
  'So how do we fix a wandering series? We take the difference! We look at the steps between the points, rather than the points themselves.',
  'And just like that, the wandering path transforms back into beautiful, tame white noise. We’ve anchored it!',
  'If your ACF refuses to die down, your data is wandering. Difference it, and bring it back down to earth.'
]);

updateNarrations('scene5.js', [
  'Our final stop: Seasonality. What if the data has a heartbeat? A pattern that repeats every single year, like the weather?',
  'You can see the rhythm in the time series. It rises and falls like clockwork.',
  'Now look at the ACF. Instead of dying off, we get these huge repeating peaks. It’s like a heartbeat on a monitor.',
  'Those peaks happen at exact intervals. If this was monthly data, you’d see a spike every 12 lags.',
  'This is the grand finale of time series analysis. By looking at the ACF, we can detect hidden rhythms, no matter how much noise tries to hide them.',
  'And that concludes our journey. You now have the tools to read the secret language of data. Keep exploring!'
]);

console.log("Narrations updated.");
