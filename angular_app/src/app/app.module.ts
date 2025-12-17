import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component'; // Исправлено
import { ContentComponent } from './components/content/content.component'; // Исправлено
import { AuthFormComponent } from './components/auth-form/auth-form.component';

import { AuthInterceptor } from './services/auth.interceptor'; // Исправлено
import { ApiService } from './services/api.service'; // Исправлено
import { AuthService } from './services/auth.service';

const routes: Routes = [
  { path: '', component: ContentComponent },
  { path: 'login', component: AuthFormComponent },
  { path: 'register', component: AuthFormComponent, data: { mode: 'register' } },
  { path: '**', redirectTo: '' }
];

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    ContentComponent,
    AuthFormComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes)
  ],
  providers: [
    ApiService,
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor, // Исправлено
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }