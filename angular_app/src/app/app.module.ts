import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { ContentComponent } from './components/content/content.component';
import { AuthFormComponent } from './components/auth-form/auth-form.component';

import { AuthInterceptor } from './services/auth.interceptor';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';

const routes: Routes = [
  { path: '', component: ContentComponent },
  { path: 'login', component: AuthFormComponent },
  { path: 'register', component: AuthFormComponent, data: { mode: 'register' } },
  { path: '**', redirectTo: '' }
];

@NgModule({ declarations: [
        AppComponent,
        HeaderComponent,
        ContentComponent,
        AuthFormComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule.forRoot(routes)], providers: [
        ApiService,
        AuthService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        },
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule { }