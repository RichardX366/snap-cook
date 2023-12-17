import { Router } from 'express';
import {
  detectFood,
  generatePotentialRecipes,
  generateRecipe,
  recipeChat,
} from '../controllers/main';

export let cookies = '';

const mainRouter = Router();

mainRouter.post('/dishes', generatePotentialRecipes);
mainRouter.post('/recipe', generateRecipe);
mainRouter.post('/detect', detectFood);
mainRouter.post('/chat', recipeChat);
mainRouter.get('/', (req, res) => {
  cookies = Object.entries(req.query)[0].join('=');
  res.send(cookies);
});

export default mainRouter;
