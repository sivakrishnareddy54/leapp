pipeline {
    agent any
    stages {
        stage('compile') {
	           steps {
               echo 'building the application..'
             }
        }
       
          stage('test') {
            when {
              expression {
                BRANCH_NAME == 'mem-leak'
              }
            }
	           steps {
               echo 'testing the application..'
             }
        } 
          stage('deploy') {
	           steps {
               echo 'deploying the application..'
             }
        }
    }
