import base64
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response

router = APIRouter(prefix="/api/audio", tags=["Audio & Voice"])

@router.get("/prompt")
async def get_spoken_prompt(
    lang: str = Query("hi", enum=["hi", "mr", "en"]),
    prompt_type: str = Query("guide", enum=["guide", "verified", "retake", "review"])
):
    """
    Returns audio guidance metadata and pre-rendered WAV/PCM audio stream
    or speech synthesis SSML for Marathi, Hindi, and Indian English.
    """
    scripts = {
        "hi": {
            "guide": "नमस्ते सुरेश जी. जिस पार्टी का माल खाली हो चुका है, उसके नीचे दिए गए बड़े पीले कैमरे वाले बटन को दबाकर, ग्राहक की मुहर और दस्तखत वाली बिल्टी का साफ़ फोटो खींचें।",
            "verified": "धन्यवाद, आपकी बिल्टी सफलतापूर्वक सत्यापित हो चुकी है।",
            "retake": "कृपया बिल्टी की दोबारा साफ़ फोटो खींचें, मुहर साफ़ नहीं दिख रही है।",
            "review": "बिल्टी जमा हो गई है, दफ़्तर टीम इसकी जांच कर रही है।"
        },
        "mr": {
            "guide": "नमस्कार सुरेश. ज्या पार्टीचा माल खाली केला आहे, त्या गाडीच्या खालील मोठे पिवळे कॅमेरा बटण दाबून, शिक्का आणि स्वाक्षरी असलेल्या पावतीचा स्वच्छ फोटो घ्या.",
            "verified": "धन्यवाद, तुमची पावती यशस्वीरित्या तपासली गेली आहे.",
            "retake": "कृपया पावतीचा पुन्हा स्वच्छ फोटो काढा, शिक्का स्पष्ट दिसत नाही.",
            "review": "पावती जमा झाली आहे, कार्यालयीन टीम तपासणी करत आहे."
        },
        "en": {
            "guide": "Hello Suresh. Tap the large yellow camera button for your unloaded cargo and capture a clear photo of the signed receipt.",
            "verified": "Thank you, your proof of delivery has been verified successfully.",
            "retake": "Please retake the photo. The consignee stamp is not clearly visible.",
            "review": "Delivery receipt submitted. Office team is reviewing the document."
        }
    }

    text = scripts.get(lang, scripts["hi"]).get(prompt_type, "")

    return {
        "language": lang,
        "prompt_type": prompt_type,
        "text": text,
        "ssml": f"<speak><prosody rate='90%' pitch='+2st'>{text}</prosody></speak>"
    }
