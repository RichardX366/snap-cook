import { Router } from 'express';
import mainRouter from './main';

const baseRouter = Router();

baseRouter.get('/', (req, res) => {
  res.send('Everything works fine.');
});

baseRouter.use('/main', mainRouter);

export default baseRouter;
