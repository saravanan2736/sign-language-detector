# Sign Language Detector: simple explanation

## What it does
You give it a short video of someone signing one word in American Sign Language (ASL).
It tells you which word it thinks it is, with a confidence score and its top 5 guesses.

## How it works (4 steps)
1. **Video to points.** MediaPipe finds 75 key points on the person in every frame: body, shoulders, arms and both hands.
2. **Pick 64 frames.** Every clip is shortened or padded to exactly 64 frames of those points. So a sign becomes a small table of numbers about how the hands and body move.
3. **Neural network (ST-GCN).** It looks at how the points move over time and in space, and gives a score for each word.
4. **Answer.** The highest score is the predicted word. The top 5 are shown too.

## The parts of the project
- **ml_pipeline/**: the data processing, the model and the training code (PyTorch).
- **backend/**: a FastAPI server with a `/predict` endpoint. It runs the model and saves each result to a small SQLite database. `/history` shows past results.
- **frontend/**: a Streamlit web page. You can upload a video, or use the live webcam tab.
- **live_camera.py**: a separate webcam script. It is faster than the browser version.
- **evaluate.py**: measures accuracy on videos the model never saw during training.

## The data
WLASL, a public ASL dataset. We used the 100-word version: about 1,100 short videos, roughly 7 per word, all from other people.

## What went wrong, and what we did (good to mention)
- First result: 96% accuracy on training videos but only 8% on new videos. The model had **memorised** the training clips instead of learning the signs. This is called overfitting.
- Fixes: normalising the points (centre on the shoulders, same scale), adding movement and hand-shape features, random augmentation, dropout, and saving the best model by validation score.
- Result after fixing: 17% top-1 and 42% top-5 on 100 words. Chance would be 1%.
- For the demo we trained a smaller model on **12 basic words** (yes, no, eat, drink, like, want, help, need, go, what, who, mother): about 33% top-1 and 67% top-3 on unseen clips. Chance would be about 8%.

## Honest limits
- It only knows those words. "Hello", "hi" and "vanakkam" are not in the dataset.
- There are very few training videos per word, so accuracy on new videos is modest.
- Live webcam signing is the weakest part, because the model never saw our camera or our signing.
- To get better: more videos per word, ideally recorded by different people, or a bigger model using the video pixels as well as the points.

## Questions your friend may ask
- **Why points and not the raw video?** It is faster, it works on an 8GB GPU, and it ignores background, clothes and lighting.
- **Why is accuracy low?** Small dataset, 12 to 100 classes, and different signers. This is a known hard problem.
- **What is top-3 or top-5?** Whether the correct word is among the 3 or 5 best guesses.
- **What would you improve first?** Collect more clips per word and add the video stream.

## Demo clips
Use the files in the `demo videos/` folder. `need`, `drink` and `no` are the most reliable.
