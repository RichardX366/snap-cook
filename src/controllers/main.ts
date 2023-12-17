import axios from 'axios';
import { RequestHandler } from 'express';
import FormData from 'form-data';
import { Configuration, OpenAIApi } from 'openai';
import Sharp from 'sharp';
import getFile from 'app-inventor-file-upload';
import { fetchImages } from '../helpers/images';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
export const openAI = new OpenAIApi(configuration);

export const generatePotentialRecipes: RequestHandler = async (req, res) => {
  const {
    flavor,
    style,
    servingSize,
    ingredients,
    bannedSeasonings,
    additionalInstructions,
    requirements,
    bannedDishes,
  } = req.body;

  const prompt = `Provide 6 potential ${flavor} ${style} dishes ${
    bannedDishes ? `other than ${bannedDishes.join(', ')}` : ''
  } for ${servingSize} people that can only use the following ingredients (It shouldn't use any extra ingredients outside the ordinary or that are not needed for the dish): ${ingredients
    .map(({ name, quantity }: { name: string; quantity: string }) =>
      quantity ? `${quantity} ${name}s` : name,
    )
    .join(', ')}. ${
    bannedSeasonings
      ? `These dishes should not include ${bannedSeasonings}. `
      : ''
  }${
    additionalInstructions
      ? `These dishes dishes should be ${additionalInstructions}. `
      : ''
  }${
    requirements ? `These dishes dishes should be ${requirements}. ` : ''
  }Format your response in JSON in the following format: [{"name": "DISH NAME", "description": "SHORT DESCRIPTION"}]`;

  const {
    data: { choices },
  } = await openAI.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        content: 'You only output JSON data, nothing else.',
        role: 'system',
      },
      {
        content: prompt,
        role: 'user',
      },
    ],
  });
  const message = choices[0].message?.content;
  if (!message) throw new Error('No message returned from OpenAI');
  const dishes: { name: string; description: string }[] = JSON.parse(message);

  res.json(
    await Promise.all(
      dishes.map(async ({ name, description }) => ({
        name,
        description,
        images: await fetchImages(name),
      })),
    ),
  );
};

export const generateRecipe: RequestHandler = async (req, res) => {
  const {
    name,
    description,
    images,
    flavor,
    style,
    servingSize,
    ingredients,
    bannedSeasonings,
    additionalInstructions,
    requirements,
  } = req.body;

  const prompt = `Prepare a detailed step by step ${flavor} ${style} recipe ${servingSize} people for ${name} that can only use the following ingredients (It shouldn't use any extra ingredients outside the ordinary or that are not needed for the dish. It should include optional ingredients that can enhance the dish with parenthesis after it saying "optional." It should definitely include all of the seasonings needed for this dish, for example, vegetable oil, salt, pepper.): ${ingredients
    .map(({ name, quantity }: { name: string; quantity: string }) =>
      quantity ? `${quantity} ${name}s` : name,
    )
    .join(', ')}. Here is a short description of the dish: ${description} ${
    bannedSeasonings
      ? `These dishes should not include ${bannedSeasonings}. `
      : ''
  }${
    additionalInstructions
      ? `These dishes dishes should be ${additionalInstructions}. `
      : ''
  }${
    requirements ? `These dishes dishes should be ${requirements}. ` : ''
  }Format your response in JSON in the following format: {"ingredients": ["INGREDIENT 1", "INGREDIENT 2"], "steps": ["STEP 1", "STEP 2"]}`;

  const {
    data: { choices },
  } = await openAI.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        content: 'You only output JSON data, nothing else.',
        role: 'system',
      },
      {
        content: prompt,
        role: 'user',
      },
    ],
  });
  const message = choices[0].message?.content;
  if (!message) throw new Error('No message returned from OpenAI');
  res.json({
    name,
    description,
    servingSize,
    ...JSON.parse(message),
    images,
  });
};

export const recipeChat: RequestHandler = async (req, res) => {
  const {
    data: { choices },
  } = await openAI.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: req.body,
  });
  const message = choices[0].message?.content;
  if (!message) throw new Error('No message returned from OpenAI');
  res.json(message);
};

export const detectFood: RequestHandler = async (req, res) => {
  const form = new FormData();
  const buffer = await getFile(req, true);
  const metadata = await Sharp(buffer).metadata();
  const image = await Sharp(buffer)
    .resize({
      width: Math.floor((metadata.width || 2048) / 2),
      fit: 'inside',
    })
    .toFormat('jpeg', { mozjpeg: true })
    .toBuffer();
  form.append('image', image, 'image.jpeg');

  const { data: foodResponse } = await axios.post(
    'https://api.logmeal.es/v2/image/segmentation/complete',
    form,
    {
      headers: {
        Authorization: 'Bearer ' + process.env.FOOD_KEY,
      },
    },
  );
  const ingredients = foodResponse.segmentation_results.map(
    (result: any) => result.recognition_results[0].name,
  );
  const response: { [ingredient: string]: number } = {};
  ingredients.forEach((ingredient: string) => {
    if (!response[ingredient]) response[ingredient] = 0;
    response[ingredient]++;
  });
  res.json(
    Object.entries(response).map(([name, quantity]) => ({ name, quantity })),
  );
};
