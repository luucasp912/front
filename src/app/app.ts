import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';
import { BottomNav } from './shared/bottom-nav/bottom-nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, BottomNav],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
