from transformers import CLIPProcessor, CLIPModel
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from io import BytesIO
from PIL import Image
import base64
import random
import torch
import os

load_dotenv()
FLASK_PORT = int(os.getenv('FLASK_PORT', 5555))  # Default port is 5555 if not specified in .env

# import 6300 features
from genrelist import genres as features
# from aestheticlist import aesthetics as features
# from genrelist import genres
# from aestheticlist import aesthetics
# features = list(set(genres + aesthetics))
# features = ["pop","rap","rock","urbano latino","hip hop","trap latino","dance pop","reggaeton","pop rap","modern rock"]

app = Flask(__name__)

# Endpoint to handle image analysis
@app.route('/analyze-image', methods=['POST'])
def analyze_image():
    # Recvieve image frokm nodes.js
    data = request.json
    base64_image = data['image']
    image_data = base64.b64decode(base64_image)
    
    # Process image and return proable features
    probabilities = process_image(image_data)
    json_data = [{'feature': feature, 'probability': probability} for feature, probability in probabilities]
    return jsonify(json_data)



# Load pre-trained model and processor
model_name = "openai/clip-vit-large-patch14"
processor = CLIPProcessor.from_pretrained(model_name)
model = CLIPModel.from_pretrained(model_name)

# Function to process image with CLIP model
def process_image(image_bytes):
    # Load and preprocess image
    image = Image.open(BytesIO(image_bytes))
    image = image.rotate(180)
    # Batch processing (adjust batch size as needed)
    random.shuffle(features)
    batch_size = len(features)//2
    probs_list = []
    for i in range(0, len(features), batch_size):
        batch_features = features[i:i + batch_size]
        # Process a batch of features
        inputs = processor(text=batch_features, images=[image], return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs = model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)
        probs_list.append(probs)
        
        # Pad probabilities to ensure consistent batch size
        max_length = max(len(probs) for probs in probs_list)
        for i in range(len(probs_list)):
            current_length = len(probs_list[i])
            if current_length < max_length:
                padding_size = max_length - current_length
                padding_probs = torch.zeros(padding_size, probs_list[i].shape[1])
                probs_list[i] = torch.cat([probs_list[i], padding_probs], dim=0)

        # Concatenate probabilities
        all_probs = torch.cat(probs_list, dim=0)

        # Get the indices of the top 5 categories with highest probabilities
        top_indices = torch.argsort(all_probs, descending=True)[0][:5]

        # Retrieve and print the top 5 categories and their probabilities
        top_categories = [(features[idx.item()], round(all_probs[0, idx].item()*100, 2)) for idx in top_indices]
        # for i, (category, probability) in enumerate(top_categories, 1):
        #     print(f"{category} {probability:.2f}")
        return top_categories

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=FLASK_PORT, debug=True)
