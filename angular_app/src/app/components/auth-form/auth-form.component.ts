import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service'; // или относительный путь

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
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    this.route.data.subscribe(data => {
      this.isRegisterMode = data['mode'] === 'register';
      if (this.isRegisterMode) {
        this.authForm.addControl('confirmPassword', this.fb.control('', Validators.required));
      } else {
        if (this.authForm.get('confirmPassword')) {
          this.authForm.removeControl('confirmPassword');
        }
      }
    });
  }

  onSubmit() {
    if (this.authForm.invalid) {
      return;
    }

    if (this.isRegisterMode && 
        this.authForm.value.password !== this.authForm.value.confirmPassword) {
      this.errorMessage = 'Пароли не совпадают';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { username, password } = this.authForm.value;

    if (this.isRegisterMode) {
      this.authService.register({ userName: username, password: password })
        .then(success => {
          this.isLoading = false;
          if (!success) {
            this.errorMessage = 'Ошибка регистрации. Возможно, пользователь уже существует';
          }
        });
    } else {
      this.authService.login(username, password)
        .then(success => {
          this.isLoading = false;
          if (!success) {
            this.errorMessage = 'Неверный логин или пароль';
          }
        });
    }
  }

  switchMode() {
    this.router.navigate([this.isRegisterMode ? '/login' : '/register']);
  }
}