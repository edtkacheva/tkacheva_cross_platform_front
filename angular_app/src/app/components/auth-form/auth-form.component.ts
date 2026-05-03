import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-auth-form',
  templateUrl: './auth-form.component.html',
  styleUrls: ['./auth-form.component.css'],
  standalone: false
})
export class AuthFormComponent implements OnInit {
  authForm: FormGroup;
  isRegisterMode = false;
  errorMessage = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.authForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', []]
    });
  }

  ngOnInit() {
    this.route.data.subscribe(data => {
      this.isRegisterMode = data['mode'] === 'register';
      const confirmCtrl = this.authForm.get('confirmPassword');
      if (this.isRegisterMode) {
        confirmCtrl?.setValidators([Validators.required, Validators.minLength(6)]);
      } else {
        confirmCtrl?.clearValidators();
      }
      confirmCtrl?.updateValueAndValidity();
    });
  }

  onSubmit() {
    if (this.authForm.invalid) {
      return;
    }

    if (this.isRegisterMode && 
        this.authForm.value.password !== this.authForm.value.confirmPassword) {
      this.errorMessage = 'Пароли не совпадают';
      console.log('Пароль 1:', this.authForm.value.password);
      console.log('Пароль 2:', this.authForm.value.confirmPassword);
      console.log('Все значения формы:', this.authForm.value);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { username, password, confirmPassword } = this.authForm.value;

    if (this.isRegisterMode) {
      this.authService.register({ userName: username, password: password })
        .then(success => {
          this.isLoading = false;
          if (!success) {
            this.errorMessage = 'Ошибка регистрации. Возможно, пользователь уже существует';
          }
          else {
            this.router.navigate(['/']);
          }
        });
    } else {
      this.authService.login(username, password)
        .then(success => {
          this.isLoading = false;
          if (!success) {
            this.errorMessage = 'Неверный логин или пароль';
          }
          else {
            this.router.navigate(['/']);
          }
        });
    }
  }

  switchMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.router.navigate([this.isRegisterMode ? '/login' : '/register']);
  }
}