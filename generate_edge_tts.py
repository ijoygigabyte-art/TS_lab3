import os
import re
import asyncio
import edge_tts

# Use a highly dynamic conversational voice
VOICE = "en-US-AriaNeural"

# Read all scenes
scenes_dir = os.path.join(os.path.dirname(__file__), 'js', 'scenes')
audio_dir = os.path.join(os.path.dirname(__file__), 'audio')

if not os.path.exists(audio_dir):
    os.makedirs(audio_dir)

async def generate_speech(text, output_file):
    communicate = edge_tts.Communicate(text, VOICE, rate="+10%")
    await communicate.save(output_file)
    print(f"Saved {output_file}")

async def main():
    for file_name in os.listdir(scenes_dir):
        if not file_name.endswith('.js'):
            continue
            
        file_path = os.path.join(scenes_dir, file_name)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Regex to extract narration and audioId
        # narration: "text", audioId: 'id'
        pattern = re.compile(r"narration:\s*(['\"])(.*?)\1,\s*audioId:\s*(['\"])(.*?)\3", re.DOTALL)
        
        for match in pattern.finditer(content):
            text = match.group(2)
            audio_id = match.group(4)
            out_file = os.path.join(audio_dir, f"{audio_id}.wav")
            
            if os.path.exists(out_file):
                continue
                
            print(f"Generating {audio_id} via Edge TTS...")
            try:
                # edge-tts generates MP3 natively, we will save it as .wav so it works with our audio.js logic
                await generate_speech(text, out_file)
            except Exception as e:
                print(f"Failed on {audio_id}: {e}")
                
if __name__ == "__main__":
    asyncio.run(main())
