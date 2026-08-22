# transformers flask python-dotenv Pillow torch flask_cors
# gunicorn
from transformers import CLIPProcessor, CLIPModel
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from io import BytesIO
from PIL import Image
from datetime import datetime
from threading import Lock
import base64
import random
import torch
import os
import time

load_dotenv()
FLASK_PORT = int(os.getenv('FLASK_PORT', 5555))

# import features
from genrelist import genres
from listaesthetics import aesthetics
from summarized_aesthetics import aesthetics

app = Flask(__name__)
CORS(app) 
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', '').lower() in ('1', 'true', 'yes')
inference_lock = Lock()

# Load pre-trained model and processor
processor_name = "openai/clip-vit-large-patch14-336"
model_name = "kevinoli/clip-finetuned-csu-p14-336-e3l57-l"
processor = CLIPProcessor.from_pretrained(processor_name)
model = CLIPModel.from_pretrained(model_name)

# Check if CUDA is available and move the model to GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
if app.config['DEBUG']:
    print("CUDA Availability: ", torch.cuda.is_available(), flush=True)

#os.system("sudo modprobe pcspkr")
#os.system("sudo sh -c \"echo -e '\a' > /dev/console\"")
#time.sleep(.2)
#os.system("sudo sh -c \"echo -e '\a' > /dev/console\"")

# Endpoint to handle image analysis
@app.route('/image-analysis/am', methods=['POST'])
def analyze_image_am():
    # recieve images from expo
    files = request.files.getlist('images')
    images = []
    for file in files:
        image = Image.open(file.stream)
        if image.mode == 'RGBA' or image.mode == 'P':
            image = image.convert('RGB')
        images.append(image)
        if app.config['DEBUG']:
            print("Image Received", flush=True)
    # process image
    with inference_lock:
        probabilities = process_images(images, aesthetics, 25, 1)
    if app.config['DEBUG']:
        print("Image Processed", flush=True)
    
    ### save image and probabilites
    current_time = datetime.now().strftime('%m-%d-%Y_%H-%M')
    save_dir = os.path.join('./uploads', current_time)
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
    for i, image in enumerate(images):
        save_path = os.path.join(save_dir, f"image{i}.jpg")
        new_width = 500
        width_percent = (new_width / float(image.size[0]))
        new_height = int((float(image.size[1]) * float(width_percent)))
        resized_image = image.resize((new_width, new_height))
        resized_image.save(save_path)
    with open(os.path.join('./uploads', current_time,'probabilities.txt'), 'w') as file:
        for feature, probability in probabilities:
            file.write(f"{feature.split(',')[0]}: {probability}\n")
        
    json_data = [{'feature': (feature.split(',')[0]), 'probability': probability} for feature, probability in probabilities]
    return jsonify(json_data)

@app.route('/image-analysis/ptp', methods=['POST'])
def analyze_image_ptp():
    # Recvieve image frokm nodes.js
    data = request.json
    base64_image = data['image']
    image_bytes = base64.b64decode(base64_image)
    image = Image.open(BytesIO(image_bytes))
    if app.config['DEBUG']:
        print("Image Received", flush=True)
        
    # Process image
    with inference_lock:
        probabilities = process_images([image], genres, 7, 5)
    if app.config['DEBUG']:
        print("Image Processed", flush=True)
    json_data = [{'feature': feature, 'probability': probability} for feature, probability in probabilities]
    return jsonify(json_data)

# Function to process image with CLIP model
def process_images(images, features, num_features=7, batch_splits=1):
    def process_batches(features, batch_size):
        probs_list = []
        for i in range(0, len(features), batch_size):
            batch_features = features[i:i + batch_size]
            inputs = processor(text=batch_features, images=images, return_tensors="pt", padding=True)
            inputs = {k: v.to(device) for k, v in inputs.items()}
            with torch.no_grad():
                outputs = model(**inputs)
            
            # Softmax probabilities for each image, averaged over all images
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1).cpu()
            combined_probs = probs.mean(dim=0)  # Average probs across images
            probs_list.append(combined_probs)
        
        # Concatenate probabilities for all batches
        return torch.cat(probs_list, dim=0)

    random.shuffle(features)
    batch_size = len(features) // batch_splits
    
    # Step 1: Process all features and get their probabilities
    all_probs = process_batches(features, batch_size)
    
    # Step 2: Select top features based on their probabilities
    top_indices = torch.argsort(all_probs, descending=True)[:num_features*10]
    top_features = [features[idx.item()] for idx in top_indices]
    
    # Step 3: Reprocess top features to get final probabilities
    top_probs = process_batches(top_features, batch_size)
    
    # Step 4: Get the top categories and their probabilities
    top_indices_final = torch.argsort(top_probs, descending=True)[:num_features]
    top_categories = [(top_features[idx.item()], round(top_probs[idx].item() * 100, 2)) for idx in top_indices_final]
    
    # Print top categories with their probabilities
    for i, (category, probability) in enumerate(top_categories, 1):
        print(f"{i}. {category} {probability:.2f}%")
    
#    os.system("sudo modprobe pcspkr")
#    os.system("sudo sh -c \"echo -e '\a' > /dev/console\"")
    torch.cuda.empty_cache() 
    return top_categories

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=FLASK_PORT, use_reloader=False)
