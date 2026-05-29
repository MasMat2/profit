import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  identifier = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async submit() {
    this.errorMessage = '';

    if (!this.identifier || !this.password) {
      this.errorMessage = 'Ingresa usuario y contraseña.';
      return;
    }

    this.isLoading = true;
    try {
      await this.authService.login(this.identifier, this.password);
      sessionStorage.setItem('isLoggedIn', 'true');
      await this.router.navigate(['/estadisticas']);
    } catch (e: any) {
      this.errorMessage = e?.error?.message ?? 'No se pudo iniciar sesión.';
    } finally {
      this.isLoading = false;
    }
  }
}
