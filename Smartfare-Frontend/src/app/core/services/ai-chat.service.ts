import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Itinerary } from '../models/itinerary.model';
import { AiItineraryChatRequest, AiItineraryChatResponse } from '../models/ai-chat.model';

@Injectable({
    providedIn: 'root'
})
export class AiChatService {
    private readonly API_URL = `${environment.apiUrl}/api/ai/itinerary/chat`;
    private readonly GENERATE_URL = `${environment.apiUrl}/api/ai/itinerary/generate`;

    constructor(private http: HttpClient) { }

    sendMessage(payload: AiItineraryChatRequest): Observable<AiItineraryChatResponse | null> {
        return this.http.post<{ success?: boolean } & AiItineraryChatResponse>(this.API_URL, payload).pipe(
            map((response) => ({
                reply: response.reply,
                suggestions: response.suggestions || [],
                actions: response.actions || [],
                followUpQuestions: response.followUpQuestions || [],
                needsConfirmation: Boolean(response.needsConfirmation),
                itinerary: response.itinerary || null,
            })),
            catchError(() => of(null))
        );
    }

    generateItinerary(prompt: string): Observable<Itinerary | null> {
        return this.http.post<{ success?: boolean; itinerary?: Itinerary }>(this.GENERATE_URL, { prompt }).pipe(
            map((response) => response.itinerary || null)
        );
    }
}
