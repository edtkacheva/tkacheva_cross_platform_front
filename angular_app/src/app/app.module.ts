import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { ContentComponent } from './components/content/content.component';
import { AuthFormComponent } from './components/auth-form/auth-form.component';
import { ChannelsComponent } from './channels/channels.component';
import { ArchiveComponent } from './archive/archive.component';
import { FavoritesComponent } from './favorites/favorites.component';

import { AuthInterceptor } from './services/auth.interceptor';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminArticlesComponent } from './admin-articles/admin-articles.component';
import { FooterComponent } from './components/footer/footer.component';

const routes: Routes = [
  { path: '', component: ContentComponent },
  { path: 'content', component: ContentComponent },
  { path: 'archive', component: ArchiveComponent },
  { path: 'favorites', component: FavoritesComponent },
  { path: 'login', component: AuthFormComponent },
  { path: 'register', component: AuthFormComponent, data: { mode: 'register' } },
  { path: 'admin/users', component: AdminUsersComponent },
  { path: 'channels', component: ChannelsComponent },
  { path: 'admin/articles', component: AdminArticlesComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    ContentComponent,
    ArchiveComponent,
    FavoritesComponent,
    AuthFormComponent,
    ChannelsComponent,
    AdminUsersComponent,
    AdminArticlesComponent,
    FooterComponent
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
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}