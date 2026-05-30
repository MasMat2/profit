import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  clave: string = '';
  password: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    if (!this.clave || !this.password) {
      this.errorMessage = 'Por favor ingrese usuario y contraseña';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.clave, this.password).subscribe({
      next: (response) => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Credenciales inválidas. Por favor intente nuevamente.';
      }
    });
  }
}
