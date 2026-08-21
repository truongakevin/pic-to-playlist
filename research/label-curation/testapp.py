from transformers import CLIPProcessor, CLIPModel, AutoProcessor, AutoModel
from flask import Flask, request, jsonify
from PIL import Image
import random
import torch

import requests

# import 6300 features
# from genrelist import genres as features
from aestheticlist import aesthetics as features
# from genrelist import genres
# from aestheticlist import aesthetics
# features = list(set(genres + aesthetics))

# random.shuffle(features)

# app = Flask(__name__)

# Load pre-trained model and processor
model_name = "openai/clip-vit-large-patch14"
processor = CLIPProcessor.from_pretrained(model_name)
model = CLIPModel.from_pretrained(model_name)

# Function to process image with CLIP model
def process_image(url):
    # Load and preprocess image
    # image = Image.open(BytesIO(image_bytes))
    # image = image.rotate(180)
    image = Image.open(requests.get(url, stream=True).raw)

    batch_size = len(features)//2
    probs_list = []
    for i in range(0, len(features), batch_size):
        batch_features = features[i:i + batch_size]
        inputs = processor(text=batch_features, images=[image], return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs = model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)
        probs_list.append(probs)
    all_probs = torch.cat(probs_list, dim=0)

    # inputs = processor(text=features, images=[image], return_tensors="pt", padding=True)
    # with torch.no_grad():
    #     outputs = model(**inputs)
    # logits_per_image = outputs.logits_per_image
    # all_probs = logits_per_image.softmax(dim=1)

    # Get the indices of the top 5 categories with highest probabilities
    # Retrieve and print the top 5 categories and their probabilities
    top_indices = torch.argsort(all_probs, descending=True)[0][:5]
    top_categories = [(features[idx.item()], round(all_probs[0, idx].item()*100, 3)) for idx in top_indices]
    for i, (category, probability) in enumerate(top_categories, 1):
        print(f"{category} {probability:.3f}")
    return top_categories

    # inputs = processor(text=features, images=[image], return_tensors="pt", padding=True)
    # with torch.no_grad():
    #     outputs = model(**inputs)
    # logits_per_image = outputs.logits_per_image
    # probs = logits_per_image.softmax(dim=1)

    # inputs = processor(text=features, images=[image], return_tensors="pt", padding=True)
    # with torch.no_grad():
    #     outputs = model(**inputs)
    # logits_per_image = outputs.logits_per_image
    # probs = torch.sigmoid(logits_per_image)

    # top_indices = torch.argsort(all_probs, descending=True)[0][:5]
    # top_categories = [(features[idx.item()], round(probs[0, idx].item())) for idx in top_indices]
    # for i, (category, probability) in enumerate(top_categories, 1):
    #     print(f"{i} {category} {probability:.5f}")
    # return top_categories

link = "https://i.ibb.co/MkBbFn7/image.jpg"
process_image(link)
