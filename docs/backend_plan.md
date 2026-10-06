# Backend and ML Pipeline Implementation Plan

This document outlines the step-by-step implementation plan for the machine learning pipeline and the backend FastAPI service for the Sign Language Detector project.

## Phase 1: Data Processing (ML Pipeline)
1. **Dataset Management**:
   - Parse the `WLASL` dataset annotations and metadata to define vocabulary and split training/validation/test sets.
2. **Video Preprocessing Module**:
   - **RGB Processing**: Use `OpenCV` to load video files, sample a fixed number of frames per clip, resize, and normalize images for the I3D visual stream.
   - **Skeletal Processing**: Integrate `MediaPipe` (Hands and Pose) to run synchronously over the extracted frames to capture upper body and hand landmarks.
3. **PyTorch Data Loaders**:
   - Create custom PyTorch `Dataset` classes that read video clips and return paired tensors: `(RGB_tensor, Skeletal_tensor, Label)`.

## Phase 2: Neural Network Architecture (ML Pipeline)
1. **Visual Stream (I3D)**:
   - Implement or load a pre-trained Inflated 3D ConvNet backbone.
   - Adjust the final layers to produce a feature embedding rather than classification logits.
2. **Skeletal Stream (ST-GCN)**:
   - Implement the graph structures (Spatial Temporal Graph Convolutional Network) representing hand and body nodes.
   - Construct the temporal convolution blocks to output a skeletal feature embedding.
3. **Fusion & Classification**:
   - Implement the projection of both visual and skeletal embeddings into a unified latent space.
   - Concatenate the projections, apply dropout, and pass them through a fully connected classification head.

## Phase 3: Training Loop & Evaluation
1. **Training Script**:
   - Set up the optimization routine using `AdamW` and cross-entropy loss.
   - Implement the training loop over epochs, including validation checks.
2. **Evaluation Metrics**:
   - Implement accuracy, precision, recall, and F1-score calculations on the held-out test set to ensure robustness as defined in the project report.
3. **Model Checkpointing**:
   - Save the best weights, vocabulary mappings, and necessary configurations for inference.

## Phase 4: API Backend (FastAPI)
1. **Inference Pipeline Integration**:
   - Load the PyTorch model checkpoint into the FastAPI application state on startup.
   - Convert the data preprocessing module (OpenCV + MediaPipe) to handle dynamically uploaded video clips.
2. **API Endpoint Expansion**:
   - Implement the `/predict` POST endpoint to ingest video, extract paired input features, run the forward pass, and return the predicted word and score.
3. **Database Integration**:
   - Set up `SQLAlchemy` with PostgreSQL to log inference history (timestamp, predicted label, confidence score, user data).
