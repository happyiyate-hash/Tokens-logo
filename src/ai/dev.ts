
'use server';

import {config} from 'dotenv';
config({path: '.env.local'});
import '@/ai/flows/auto-fetch-missing-logos.ts';

    