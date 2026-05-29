

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{mitaoeminorreport}[2022/17/07 v2.0 MITAOE-E&TC Document Class for Project Reports]

\LoadClass[a4paper,11pt,onesided]{report}
\RequirePackage{ragged2e}
\RequirePackage{graphics}
\RequirePackage{color}
\RequirePackage{array}
\RequirePackage{multirow}
\RequirePackage{amsmath}
\RequirePackage{amsfonts}
\RequirePackage{amssymb}
\RequirePackage{graphicx}
\RequirePackage[caption]{subfig}
\RequirePackage{pifont}
\RequirePackage{longtable}
\RequirePackage{enumerate}
\RequirePackage{enumitem}
\RequirePackage[english]{babel}
\RequirePackage{array}
\RequirePackage[toc,page]{appendix}
\RequirePackage{hyperref}
\RequirePackage[notocbib]{apacite}
\RequirePackage{url}
\RequirePackage[intoc]{nomencl}
%\RequirePackage[left=1.25in,right=1in,top=1in,bottom=1in]{geometry}

\setlength{\topmargin}{-0.75in}
\setlength{\topskip}{0.5in}
\setlength{\textheight}{10.15in}
\setlength{\textwidth}{5.95in}
\setlength{\oddsidemargin}{0.25in}
\setlength{\evensidemargin}{0.35in}
\setlength{\footskip}{0.5in}
\setlength{\parindent}{0mm}
\setlength{\parskip}{3mm}



\renewcommand{\baselinestretch}{1.2}
\renewcommand{\arraystretch}{1.4}
\renewcommand{\bibname}{References}

\newcommand*{\@projecttitle}{}
\newcommand*{\projecttitle}[1]{\renewcommand*{\@projecttitle}{#1}}

\newcommand*{\@schoolname}{}
\newcommand*{\schoolname}[1]{\renewcommand*{\@schoolname}{#1}}

\newcommand*{\@department}{}
\newcommand*{\department}[1]{\renewcommand*{\@department}{#1}}

\newcommand*{\@projectadvisor}{}
\newcommand*{\projectadvisor}[1]{\renewcommand*{\@projectadvisor}{#1}}

\newcommand*{\@projectcoordinator}{}
\newcommand*{\projectcoordinator}[1]{\renewcommand*{\@projectcoordinator}{#1}}

\newcommand*{\@dean}{}
\newcommand*{\dean}[1]{\renewcommand*{\@dean}{#1}}

\newcommand*{\@academicyear}{}
\newcommand*{\academicyear}[1]{\renewcommand*{\@academicyear}{#1}}

\newcommand*{\@students}{}
\newcommand*{\student}[2]{%
\protected@edef\@students{\@students \large\bf#1 & \large\bf(Exam Seat No. #2)\\}%
}

\renewcommand{\titlepage}{%
\begin{center}
\vspace*{-18mm}

\rule{\textwidth}{0.01in}
\begin{figure}[h!]
    \begin{center}
        \includegraphics[scale=0.5]{maelogo}
    \end{center}
\end{figure}

\Large{\textbf {A Project Report on}}\\[3mm]
\LARGE{\textbf{\@projecttitle}} \\ [7mm]
\large{\textit{\textbf {Submitted by,}}} \\ [1mm]
\begin{tabular}{@{}p{6.0cm}l@{}l}
\@students
\end{tabular}

\vspace*{5mm}
\large{\textbf{\textit{Guided by,}}} \\ [1mm]
\Large{\textbf{{\@projectadvisor}}} \\ [10mm]
\large{\bf{A Report submitted to MIT Academy of Engineering, Alandi(D), Pune,}}
\large{\bf{An Autonomous Institute Affiliated to  Savitribai Phule Pune University}}
\large{\bf{in partial fulfillment of the requirements of}}
\vspace*{10mm}

{\large{\bf{THIRD YEAR BACHELOR OF TECHNOLOGY}} in}\\
\Large{\bf{\@department}} \\ [10mm]

\Large{\textbf{Department of \@department}} \\
\LARGE{\textbf{MIT Academy of Engineering}} \\
\large{(An Autonomous Institute Affiliated to  Savitribai Phule Pune University)}\\
\Large\textbf{Alandi (D), Pune -- 412105} \\[3mm]
\LARGE{\textbf{(\@academicyear)}}
\rule{\textwidth}{0.01in}
\end{center}
}

\newcommand{\certificate}{%
\clearpage
\newpage
\vspace*{-10mm}
\begin{figure}[h!]
    \begin{center}
        \includegraphics[scale=0.5]{maelogo}
    \end{center}
\end{figure}

\begin{center}
{\LARGE{\textbf{\underline{CERTIFICATE}}}} \\ [7mm]
\end{center}

\renewcommand{\baselinestretch}{1.6}
\large{It is hereby certified that the work which is being presented in the Third Year Major Project--1 Report entitled \textbf{``\@projecttitle"}, in partial fulfillment of the requirements for the award of the Bachelor of Technology
in \@department and submitted to the \textbf{Department of \@department} of \textbf{MIT Academy of Engineering, Alandi(D), Pune, Affiliated to Savitribai Phule Pune University (SPPU), Pune}, is an authentic record of work carried out during
Academic Year \textbf{\@academicyear} Semester \textbf{VI}, under the supervision of \textbf{\@projectadvisor}, \textbf{Department of \@department}} \\ [5mm]

\begin{center}
\begin{tabular}{@{}p{6.0cm}l@{}l}
\@students
\end{tabular}
\vspace*{2mm}
\end{center}

\vspace*{15mm}
\begin{minipage}{0.35\textwidth}
\begin{center}
\textbf{\@projectadvisor} \\ [-1mm]
\textbf{Project Advisor}
\end{center}
\end{minipage}
\hfill
\begin{minipage}{0.35\textwidth}
\begin{center}
\textbf{\@projectcoordinator} \\ [-1mm]
\textbf{Project Coordinator}
\end{center}
\end{minipage}


\vspace*{18mm}
\begin{minipage}{0.35\textwidth}
\begin{center}
\textbf{\@dean} \\ [-1mm]
\textbf{HoD}
\end{center}
\end{minipage}
\hfill
\begin{minipage}{0.35\textwidth}
\begin{center}
%\textbf{Prasheel V. Suryawanshi} \\ [-1mm]
\textbf{External Examiner}
\end{center}
\end{minipage}

%\vspace*{2mm}
\rule{\textwidth}{0.01in}
}

\newcommand{\declaration}{%
\clearpage
\newpage
\vspace*{-10mm}

\begin{center}
{\LARGE{\textbf{\underline{DECLARATION}}}} \\ [10mm]
\end{center}

\renewcommand{\baselinestretch}{1.6}
{\large{We the undersigned solemnly declare that the project report is based on our own work carried out during the course of our study under the supervision of \textbf{\@projectadvisor}.\\[2mm]
We assert the statements made and conclusions drawn are an outcome of our project work. We further certify that}}
\begin{enumerate}
  \item {\large The work contained in the report is original and has been done by us under the general supervision of our supervisor.}
  \item {\large The work has not been submitted to any other Institution for any other degree/diploma/certificate in this Institute/University or any other Institute/University
of India or abroad.}
  \item {\large We have followed the guidelines provided by the Institute in writing the report.}
  \item {\large Whenever we have used materials (data, theoretical analysis, and text) from other sources, we have given due credit to them in the text of the report and giving their
details in the references.}
\end{enumerate}
\vspace{10mm}

\begin{center}
\begin{tabular}{@{}p{6.0cm}l@{}l@{}}
\@students
\end{tabular}
\vspace*{5mm}
\end{center}

%\vspace*{2mm}
\rule{\textwidth}{0.01in}
}

\endinput
