import os
from bson import ObjectId
from flask import Flask, jsonify, render_template, request, session
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from werkzeug.security import generate_password_hash, check_password_hash
import re
from datetime import datetime, timezone

NUMERIC_INGREDIENT_PATTERN = re.compile(
    r"""^\s*(
        \d+(\.\d+)?        # 1 or 1.5
        |\d+/\d+           # 1/2
        |[¼½¾⅓⅔⅛⅜⅝⅞]      # unicode fractions
    )
    """,
    re.VERBOSE
)

def is_numeric_ingredient(s: str) -> bool:
    return bool(NUMERIC_INGREDIENT_PATTERN.match(s))

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-change-me")

@app.get("/")
def index():
    return render_template("index.html")

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://caoilainnjohnsson_db_user:CS_3800Baking@bakingapp-db.js1wajy.mongodb.net/?appName=BakingApp-db",
)

client = MongoClient(MONGODB_URI)
db = client["BakingApp"]
collection = db["item"]
users = db["users"]
users.create_index("email", unique=True)


def recipe_from_mongo(doc, viewer=None):
    liked_by = doc.get("liked_by_user_ids", [])
    viewer_id = str(viewer["_id"]) if viewer else ""
    comments = []

    for comment in doc.get("comments", []):
        comments.append({
            "id": comment.get("id", ""),
            "user_id": comment.get("user_id", ""),
            "author": comment.get("author", ""),
            "text": comment.get("text", ""),
            "created_at": comment.get("created_at", ""),
        })

    return {
        "id": str(doc["_id"]),
        "title": doc.get("title") or doc.get("item", ""),
        "author": doc.get("author", "RecipeShare"),
        "minutes": int(doc.get("minutes", doc.get("time", 0)) or 0),
        "image": doc.get("image") or doc.get("image_url", ""),
        "tags": doc.get("tags", []),
        "ingredients": doc.get("ingredients", []),
        "steps": doc.get("steps", []),
        "user_id": doc.get("user_id", ""),
        "like_count": len(liked_by),
        "liked_by_current_user": bool(viewer_id and viewer_id in liked_by),
        "comments": comments,
        "comment_count": len(comments),
    }


def public_user(doc):
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "saved_recipe_ids": doc.get("saved_recipe_ids", []),
        "liked_recipe_ids": doc.get("liked_recipe_ids", []),
    }


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None

    try:
        user = users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None

    if not user:
        session.pop("user_id", None)
        return None

    updates = {}
    if "saved_recipe_ids" not in user:
        updates["saved_recipe_ids"] = []
        user["saved_recipe_ids"] = []
    if "liked_recipe_ids" not in user:
        updates["liked_recipe_ids"] = []
        user["liked_recipe_ids"] = []
    if updates:
        users.update_one({"_id": user["_id"]}, {"$set": updates})

    return user


@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    doc = {
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "saved_recipe_ids": [],
        "liked_recipe_ids": [],
    }

    try:
        result = users.insert_one(doc)
    except DuplicateKeyError:
        return jsonify({"error": "An account with that email already exists"}), 409

    user = users.find_one({"_id": result.inserted_id})
    session["user_id"] = str(user["_id"])
    return jsonify(public_user(user)), 201


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users.find_one({"email": email})
    if not user or not check_password_hash(user.get("password_hash", ""), password):
        return jsonify({"error": "Invalid email or password"}), 401

    updates = {}
    if "saved_recipe_ids" not in user:
        updates["saved_recipe_ids"] = []
        user["saved_recipe_ids"] = []
    if "liked_recipe_ids" not in user:
        updates["liked_recipe_ids"] = []
        user["liked_recipe_ids"] = []
    if updates:
        users.update_one({"_id": user["_id"]}, {"$set": updates})

    session["user_id"] = str(user["_id"])
    return jsonify(public_user(user))


@app.post("/api/logout")
def logout():
    session.pop("user_id", None)
    return jsonify({"ok": True})


@app.get("/api/me")
def me():
    user = current_user()
    return jsonify({"user": public_user(user) if user else None})


@app.get("/api/recipes")
def get_recipes():
    query = request.args.get("query", "").strip()

    mongo_filter = {}
    if query:
        mongo_filter = {
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"item": {"$regex": query, "$options": "i"}},
                {"author": {"$regex": query, "$options": "i"}},
                {"tags": {"$regex": query, "$options": "i"}},
            ]
        }

    viewer = current_user()
    docs = collection.find(mongo_filter).sort("_id", -1)
    recipes = [recipe_from_mongo(doc, viewer) for doc in docs]
    return jsonify(recipes)


@app.get("/api/recipes/<recipe_id>")
def get_recipe(recipe_id):
    try:
        doc = collection.find_one({"_id": ObjectId(recipe_id)})
    except Exception:
        return jsonify({"error": "Invalid recipe id"}), 400

    if not doc:
        return jsonify({"error": "Recipe not found"}), 404

    return jsonify(recipe_from_mongo(doc, current_user()))


@app.post("/api/recipes")
def create_recipe():
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    image = (data.get("image") or "").strip()

    try:
        minutes = int(data.get("minutes", 0) or 0)
    except (TypeError, ValueError):
        minutes = 0

    tags = data.get("tags", [])
    ingredients = data.get("ingredients", [])

    if not isinstance(ingredients, list):
        ingredients = []

    invalid = [i for i in ingredients if not is_numeric_ingredient(i)]
    if invalid:
        return jsonify({
            "error": "All ingredients must start with a numeric measurement",
            "invalid": invalid
        }), 400
    
    steps = data.get("steps", [])

    if not title:
        return jsonify({"error": "Title is required"}), 400

    doc = {
        "title": title,
        "item": title,
        "author": user["name"],
        "user_id": str(user["_id"]),
        "minutes": minutes,
        "time": minutes,
        "image": image,
        "image_url": image,
        "tags": tags if isinstance(tags, list) else [],
        "ingredients": ingredients if isinstance(ingredients, list) else [],
        "steps": steps if isinstance(steps, list) else [],
        "liked_by_user_ids": [],
        "comments": [],
    }

    result = collection.insert_one(doc)
    created = collection.find_one({"_id": result.inserted_id})
    return jsonify(recipe_from_mongo(created, user)), 201


@app.get("/api/my-recipes")
def get_my_recipes():
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    docs = collection.find({"user_id": str(user["_id"])}).sort("_id", -1)
    return jsonify([recipe_from_mongo(doc, user) for doc in docs])


@app.put("/api/recipes/<recipe_id>")
def update_recipe(recipe_id):
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    try:
        recipe_obj_id = ObjectId(recipe_id)
    except Exception:
        return jsonify({"error": "Invalid recipe id"}), 400

    recipe = collection.find_one({"_id": recipe_obj_id})
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404

    if recipe.get("user_id") != str(user["_id"]):
        return jsonify({"error": "You can only edit your own posts"}), 403

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    image = (data.get("image") or "").strip()

    try:
        minutes = int(data.get("minutes", 0) or 0)
    except (TypeError, ValueError):
        minutes = 0

    tags = data.get("tags", [])
    ingredients = data.get("ingredients", [])
    steps = data.get("steps", [])

    if not title:
        return jsonify({"error": "Title is required"}), 400

    if not isinstance(tags, list):
        tags = []
    if not isinstance(ingredients, list):
        ingredients = []
    if not isinstance(steps, list):
        steps = []

    ingredients = [str(i).strip() for i in ingredients if str(i).strip()]
    steps = [str(s).strip() for s in steps if str(s).strip()]

    invalid = [i for i in ingredients if not is_numeric_ingredient(i)]
    if invalid:
        return jsonify({
            "error": "All ingredients must start with a numeric measurement",
            "invalid": invalid
        }), 400

    update = {
        "title": title,
        "item": title,
        "minutes": minutes,
        "time": minutes,
        "image": image,
        "image_url": image,
        "tags": [str(t).strip() for t in tags if str(t).strip()],
        "ingredients": ingredients,
        "steps": steps,
    }

    collection.update_one({"_id": recipe_obj_id}, {"$set": update})
    refreshed = collection.find_one({"_id": recipe_obj_id})
    return jsonify(recipe_from_mongo(refreshed, user))


@app.get("/api/saved")
def get_saved_recipes():
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    saved_ids = []
    for raw_id in user.get("saved_recipe_ids", []):
        try:
            saved_ids.append(ObjectId(raw_id))
        except Exception:
            continue

    if not saved_ids:
        return jsonify([])

    docs = collection.find({"_id": {"$in": saved_ids}})
    by_id = {str(doc["_id"]): recipe_from_mongo(doc, user) for doc in docs}
    ordered = [by_id[rid] for rid in user.get("saved_recipe_ids", []) if rid in by_id]
    return jsonify(ordered)


@app.post("/api/saved/<recipe_id>")
def save_recipe(recipe_id):
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    try:
        recipe_obj_id = ObjectId(recipe_id)
    except Exception:
        return jsonify({"error": "Invalid recipe id"}), 400

    recipe = collection.find_one({"_id": recipe_obj_id})
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404

    users.update_one(
        {"_id": user["_id"]},
        {"$addToSet": {"saved_recipe_ids": recipe_id}}
    )

    refreshed = users.find_one({"_id": user["_id"]})
    return jsonify(public_user(refreshed))


@app.delete("/api/saved/<recipe_id>")
def unsave_recipe(recipe_id):
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    users.update_one(
        {"_id": user["_id"]},
        {"$pull": {"saved_recipe_ids": recipe_id}}
    )

    refreshed = users.find_one({"_id": user["_id"]})
    return jsonify(public_user(refreshed))


@app.get("/api/liked")
def get_liked_recipes():
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    liked_ids = []
    for raw_id in user.get("liked_recipe_ids", []):
        try:
            liked_ids.append(ObjectId(raw_id))
        except Exception:
            continue

    if not liked_ids:
        return jsonify([])

    docs = collection.find({"_id": {"$in": liked_ids}})
    by_id = {str(doc["_id"]): recipe_from_mongo(doc, user) for doc in docs}
    ordered = [by_id[rid] for rid in user.get("liked_recipe_ids", []) if rid in by_id]
    return jsonify(ordered)


@app.post("/api/likes/<recipe_id>")
def like_recipe(recipe_id):
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    try:
        recipe_obj_id = ObjectId(recipe_id)
    except Exception:
        return jsonify({"error": "Invalid recipe id"}), 400

    recipe = collection.find_one({"_id": recipe_obj_id})
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404

    user_id = str(user["_id"])
    collection.update_one(
        {"_id": recipe_obj_id},
        {"$addToSet": {"liked_by_user_ids": user_id}}
    )
    users.update_one(
        {"_id": user["_id"]},
        {"$addToSet": {"liked_recipe_ids": recipe_id}}
    )

    refreshed_user = users.find_one({"_id": user["_id"]})
    refreshed_recipe = collection.find_one({"_id": recipe_obj_id})
    return jsonify({
        "user": public_user(refreshed_user),
        "recipe": recipe_from_mongo(refreshed_recipe, refreshed_user),
    })


@app.delete("/api/likes/<recipe_id>")
def unlike_recipe(recipe_id):
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    try:
        recipe_obj_id = ObjectId(recipe_id)
    except Exception:
        return jsonify({"error": "Invalid recipe id"}), 400

    collection.update_one(
        {"_id": recipe_obj_id},
        {"$pull": {"liked_by_user_ids": str(user["_id"])}}
    )
    users.update_one(
        {"_id": user["_id"]},
        {"$pull": {"liked_recipe_ids": recipe_id}}
    )

    refreshed_user = users.find_one({"_id": user["_id"]})
    refreshed_recipe = collection.find_one({"_id": recipe_obj_id})
    return jsonify({
        "user": public_user(refreshed_user),
        "recipe": recipe_from_mongo(refreshed_recipe, refreshed_user) if refreshed_recipe else None,
    })


@app.post("/api/recipes/<recipe_id>/comments")
def add_comment(recipe_id):
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    try:
        recipe_obj_id = ObjectId(recipe_id)
    except Exception:
        return jsonify({"error": "Invalid recipe id"}), 400

    recipe = collection.find_one({"_id": recipe_obj_id})
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404

    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Comment text is required"}), 400

    if len(text) > 500:
        return jsonify({"error": "Comments must be 500 characters or fewer"}), 400

    comment = {
        "id": str(ObjectId()),
        "user_id": str(user["_id"]),
        "author": user.get("name", ""),
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    collection.update_one(
        {"_id": recipe_obj_id},
        {"$push": {"comments": comment}}
    )

    refreshed_recipe = collection.find_one({"_id": recipe_obj_id})
    return jsonify(recipe_from_mongo(refreshed_recipe, user)), 201


@app.get("/create")
@app.get("/profile")
@app.get("/saved")
@app.get("/liked")
@app.get("/recipe/<recipe_id>")
def spa_fallback(recipe_id=None):
    return render_template("index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, debug=True)