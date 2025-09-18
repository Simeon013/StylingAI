import { GoogleGenAI, Modality, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeImageItems = async (imageFile: File): Promise<string[]> => {
    try {
        const imageBase64 = await fileToBase64(imageFile);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: imageBase64,
                            mimeType: imageFile.type,
                        },
                    },
                    {
                        text: "Analysez cette image et identifiez chaque vêtement et accessoire distinct. Fournissez un nom court et descriptif pour chacun. Retournez le résultat sous forme de tableau JSON de chaînes de caractères. Exemple : [\"Robe à fleurs\", \"Chapeau de paille\", \"Lunettes de soleil aviateur\"]",
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                        description: "Nom du vêtement ou de l'accessoire"
                    }
                },
            },
        });

        const jsonStr = response.text.trim();
        const items = JSON.parse(jsonStr);
        if (!Array.isArray(items) || !items.every(item => typeof item === 'string')) {
             throw new Error("La réponse de l'IA n'est pas un tableau de chaînes de caractères valide.");
        }
        return items;

    } catch (error) {
        console.error("Error analyzing image items:", error);
        throw new Error("L'analyse de l'image pour les articles a échoué.");
    }
};


export const generateOutfitImage = async (personFile: File, clothingFile: File, selectedItems: string[]): Promise<string> => {
    try {
        const personImageBase64 = await fileToBase64(personFile);
        const clothingImageBase64 = await fileToBase64(clothingFile);
        
        let itemInstructions = `À partir de l'Image 2, appliquez **UNIQUEMENT** les éléments suivants sur la personne : ${selectedItems.join(', ')}. Ignorez tous les autres éléments qui pourraient être présents dans l'Image 2.`;

        if (selectedItems.length === 1 && selectedItems[0] === "L'ensemble du vêtement/accessoire") {
            itemInstructions = `À partir de l'Image 2, appliquez le vêtement ou l'accessoire principal sur la personne.`;
        }


        const textPrompt = `
MISSION : Agir en tant que styliste virtuel et expert en retouche photo.

ENTRÉES :
- Image 1 : Une photo d'une personne (le modèle).
- Image 2 : Une photo d'un ou plusieurs vêtements/accessoires.

INSTRUCTIONS DÉTAILLÉES :
1.  **Analyse de l'Image 1 :** Identifie la personne, sa morphologie, sa pose et l'arrière-plan. **IGNORE COMPLÈTEMENT les vêtements que la personne porte actuellement.** Ta tâche n'est PAS de les modifier, mais de les remplacer.
2.  **Analyse de l'Image 2 :** Identifie avec précision les caractéristiques des vêtements et accessoires.
3.  **Génération :** Crée une NOUVELLE image photoréaliste en superposant les articles sélectionnés de l'Image 2 sur la personne de l'Image 1.

RÈGLES CRITIQUES :
- ${itemInstructions}
- Les articles appliqués sur l'image finale doivent être une **reproduction fidèle** de ceux de l'Image 2. La couleur, la longueur des manches et tous les autres détails doivent être préservés.
- Le visage, le corps, la pose et l'arrière-plan de la personne de l'Image 1 doivent rester **inchangés**.
- L'ajustement des articles sur le corps doit être naturel et réaliste.
- **NE PAS produire de texte.** La sortie doit être UNIQUEMENT l'image finale.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: personImageBase64,
                            mimeType: personFile.type,
                        },
                    },
                    {
                        inlineData: {
                            data: clothingImageBase64,
                            mimeType: clothingFile.type,
                        },
                    },
                    {
                        text: textPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart && imagePart.inlineData) {
            const base64ImageBytes: string = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            return `data:${mimeType};base64,${base64ImageBytes}`;
        } else {
            const textResponse = response.text?.trim();
            if (textResponse) {
                console.error("Gemini API text response:", textResponse);
                throw new Error(`L'IA a répondu avec du texte au lieu d'une image : "${textResponse}"`);
            }
            console.error("Gemini API full response:", JSON.stringify(response, null, 2));
            throw new Error("L'IA n'a pas retourné d'image. Veuillez réessayer avec d'autres images.");
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error && error.message.startsWith("L'IA a répondu")) {
            throw error;
        }
        throw new Error("La génération d'image a échoué. Vérifiez la console pour plus de détails.");
    }
};
