import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScriptLoaderService {
  constructor() {
    // Analytics and marketing scripts are not used in the current build.
  }
}
