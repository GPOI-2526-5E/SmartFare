import { HttpContextToken } from '@angular/common/http';

export const LOADER_MESSAGE = new HttpContextToken<string | null>(() => null);
